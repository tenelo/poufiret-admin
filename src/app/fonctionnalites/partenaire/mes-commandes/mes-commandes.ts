import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval } from 'rxjs';

import { MesCommandesService } from './mes-commandes.service';
import { DetailCommande } from './detail-commande/detail-commande';
import { extraireMessageErreur } from '../mes-produits/extraire-message-erreur';
import {
  ActionTransitionCommande,
  Commande,
  ETATS_ACTIFS,
  ETATS_FINAUX,
  FiltresCommandesPartenaire,
  FiltresPeriode,
  LIBELLES_MODE_LIVRAISON,
  LIBELLES_STATUT_COMMANDE,
  OPTIONS_FILTRE_STATUT,
  ResumeCommandes,
  StatutCommande,
  TRANSITIONS_PARTENAIRE,
} from '../../../modeles/commande.model';

const INTERVALLE_RAFRAICHISSEMENT_MS = 20000;
const TAILLE_PAGE_TABLE = 25;

type ModePeriode = 'aujourdhui' | 'plage' | 'tout';
type Onglet = 'suivi' | 'historique';

// Colonnes du tableau de suivi, dans l'ordre du cycle de vie d'une commande.
const COLONNES_SUIVI: { statut: StatutCommande; libelle: string }[] = [
  { statut: 'nouvelle', libelle: 'Nouvelles' },
  { statut: 'acceptee', libelle: 'Acceptées' },
  { statut: 'en_preparation', libelle: 'En préparation' },
  { statut: 'prete', libelle: 'Prêtes' },
  { statut: 'en_livraison', libelle: 'En livraison' },
];

// Rangée de récap d'où provient une carte cliquée : "periode" = filtres actifs,
// "globale" = depuis toujours, sans filtre.
type RangeeCarte = 'periode' | 'globale';
type GroupeCarte = 'nouvelle' | 'acceptee' | 'en_preparation' | 'periode' | 'ca' | 'total';

interface CarteSelectionnee {
  rangee: RangeeCarte;
  groupe: GroupeCarte;
}

interface DefinitionGroupeTable {
  titre: string;
  statut?: StatutCommande;
}

type ColonneTri = 'numero' | 'client' | 'mode' | 'statut' | 'total' | 'date';

// Cartes de récap communes aux deux rangées (période / globale), même ordre d'affichage.
const CARTES_RECAP: { groupe: GroupeCarte; libelle: string }[] = [
  { groupe: 'nouvelle', libelle: 'Nouvelles' },
  { groupe: 'acceptee', libelle: 'Acceptées' },
  { groupe: 'en_preparation', libelle: 'En préparation' },
  { groupe: 'periode', libelle: 'Commandes' },
  { groupe: 'ca', libelle: 'CA' },
  { groupe: 'total', libelle: 'Total' },
];

/**
 * Page "Mes commandes" de l'espace partenaire : récap chiffré sur deux rangées
 * (période active / global depuis toujours), suivi des commandes classées par
 * statut ou historique, et vue tableau détaillée sur clic d'une carte de récap.
 */
@Component({
  selector: 'app-mes-commandes',
  imports: [DetailCommande],
  templateUrl: './mes-commandes.html',
  styleUrl: './mes-commandes.scss',
})
export class MesCommandes implements OnInit {
  private readonly mesCommandesService = inject(MesCommandesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly colonnesSuivi = COLONNES_SUIVI;
  readonly cartesRecap = CARTES_RECAP;
  readonly optionsFiltre = OPTIONS_FILTRE_STATUT;
  readonly libellesStatut = LIBELLES_STATUT_COMMANDE;
  readonly libellesModeLivraison = LIBELLES_MODE_LIVRAISON;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly commandes = signal<Commande[]>([]);
  readonly filtreStatut = signal<StatutCommande | ''>('');

  readonly modePeriode = signal<ModePeriode>('aujourdhui');
  readonly dateDebut = signal('');
  readonly dateFin = signal('');

  readonly onglet = signal<Onglet>('suivi');

  readonly resumePeriode = signal<ResumeCommandes | null>(null);
  readonly resumeGlobal = signal<ResumeCommandes | null>(null);

  // Carte de récap actuellement sélectionnée (aucune par défaut) : pilote la
  // bascule colonnes/tableau et le périmètre affiché dans le tableau.
  readonly carteSelectionnee = signal<CarteSelectionnee | null>(null);

  // ---- Vue tableau (ouverte depuis une carte de récap) ----
  readonly chargementTable = signal(false);
  readonly erreurTable = signal<string | null>(null);
  readonly commandesTable = signal<Commande[]>([]);
  readonly pageTableIndex = signal(0);
  readonly colonneTri = signal<ColonneTri>('date');
  readonly directionTri = signal<'asc' | 'desc'>('desc');
  readonly transitionInlineEnCoursId = signal<number | null>(null);

  // Détail d'une commande, ouvert en dialog : toujours rechargé via
  // GET /orders/commandes/<id>/ au clic (état à jour), pas réutilisé depuis
  // la liste déjà en mémoire.
  readonly detailCommandeId = signal<number | null>(null);
  readonly detailCommande = signal<Commande | null>(null);
  readonly chargementDetail = signal(false);
  readonly erreurDetail = signal<string | null>(null);

  readonly messageEphemere = signal<string | null>(null);
  private timerMessageEphemere: ReturnType<typeof setTimeout> | undefined;

  readonly commandesActives = computed(() => this.commandes().filter((c) => ETATS_ACTIFS.includes(c.statut)));

  readonly commandesHistorique = computed(() =>
    [...this.commandes()]
      .filter((c) => ETATS_FINAUX.includes(c.statut))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );

  readonly colonnes = computed(() => {
    const actives = this.commandesActives();
    return this.colonnesSuivi.map((colonne) => ({
      ...colonne,
      commandes: actives.filter((c) => c.statut === colonne.statut),
    }));
  });

  // Libellé de la période active, affiché au-dessus de la rangée "Sur la période".
  readonly libellePeriodeActive = computed(() => {
    switch (this.modePeriode()) {
      case 'aujourdhui':
        return "Aujourd'hui";
      case 'tout':
        return 'Toutes périodes';
      case 'plage': {
        const debut = this.dateDebut();
        const fin = this.dateFin();
        if (debut && fin) {
          return `du ${this.formaterDateCourte(debut)} au ${this.formaterDateCourte(fin)}`;
        }
        return 'Plage à choisir';
      }
    }
  });

  readonly vueTableau = computed(() => this.carteSelectionnee() !== null);

  private readonly definitionGroupeActuelle = computed<DefinitionGroupeTable | null>(() => {
    const carte = this.carteSelectionnee();
    if (!carte) {
      return null;
    }
    const globale = carte.rangee === 'globale';
    switch (carte.groupe) {
      case 'nouvelle':
        return { titre: 'Nouvelles', statut: 'nouvelle' };
      case 'acceptee':
        return { titre: 'Acceptées', statut: 'acceptee' };
      case 'en_preparation':
        return { titre: 'En préparation', statut: 'en_preparation' };
      case 'periode':
        return { titre: globale ? 'Toutes les commandes' : 'Commandes de la période' };
      case 'ca':
        return { titre: globale ? 'Commandes livrées (global)' : 'Commandes livrées de la période', statut: 'livree' };
      case 'total':
        return { titre: globale ? 'Total (global)' : 'Total de la période' };
    }
  });

  readonly titreTableau = computed(() => this.definitionGroupeActuelle()?.titre ?? '');

  readonly commandesTableTriees = computed(() => {
    const liste = [...this.commandesTable()];
    const colonne = this.colonneTri();
    const sens = this.directionTri() === 'asc' ? 1 : -1;
    liste.sort((a, b) => {
      switch (colonne) {
        case 'numero':
          return a.numero.localeCompare(b.numero) * sens;
        case 'client':
          return a.client_nom.localeCompare(b.client_nom) * sens;
        case 'mode':
          return a.mode_livraison.localeCompare(b.mode_livraison) * sens;
        case 'statut':
          return a.statut.localeCompare(b.statut) * sens;
        case 'total':
          return (Number(a.total) - Number(b.total)) * sens;
        case 'date':
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * sens;
      }
    });
    return liste;
  });

  readonly totalPagesTable = computed(() =>
    Math.max(1, Math.ceil(this.commandesTableTriees().length / TAILLE_PAGE_TABLE)),
  );

  readonly commandesPageTable = computed(() => {
    const debut = this.pageTableIndex() * TAILLE_PAGE_TABLE;
    return this.commandesTableTriees().slice(debut, debut + TAILLE_PAGE_TABLE);
  });

  ngOnInit(): void {
    // Lien profond depuis la cloche de notification (?statut=nouvelle), par ex.
    const statutDepuisUrl = this.route.snapshot.queryParamMap.get('statut') as StatutCommande | null;
    if (statutDepuisUrl && this.optionsFiltre.some((o) => o.valeur === statutDepuisUrl)) {
      this.filtreStatut.set(statutDepuisUrl);
    }

    this.chargerCommandes();
    this.chargerResumes();

    interval(INTERVALLE_RAFRAICHISSEMENT_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Ne pas perturber une action en cours : on saute le tick tant qu'un
        // détail de commande est ouvert (dialog).
        if (this.detailCommandeId()) {
          return;
        }
        this.chargerCommandes(true);
        this.chargerResumes();
        if (this.carteSelectionnee()) {
          this.chargerTable(true);
        }
      });
  }

  chargerCommandes(silencieux = false): void {
    if (!silencieux) {
      this.chargementEnCours.set(true);
      this.erreurChargement.set(null);
    }

    this.mesCommandesService.listerCommandesPartenaire(this.filtresActuels()).subscribe({
      next: (commandes) => {
        this.chargementEnCours.set(false);
        this.commandes.set(
          [...commandes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        );
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        if (!silencieux) {
          this.erreurChargement.set(extraireMessageErreur(erreur));
        }
      },
    });
  }

  chargerResumes(): void {
    this.mesCommandesService.resume(this.parametresPeriodeActive()).subscribe({
      next: (resume) => this.resumePeriode.set(resume),
      error: () => {
        // Non bloquant : la rangée de récap reste simplement vide si l'appel échoue.
      },
    });
    this.mesCommandesService.resume().subscribe({
      next: (resume) => this.resumeGlobal.set(resume),
      error: () => {},
    });
  }

  rafraichirTout(): void {
    this.chargerCommandes(false);
    this.chargerResumes();
    if (this.carteSelectionnee()) {
      this.chargerTable(false);
    }
  }

  private parametresPeriodeActive(): FiltresPeriode {
    const mode = this.modePeriode();
    if (mode === 'aujourdhui') {
      return { date: 'today' };
    }
    if (mode === 'plage') {
      return { debut: this.dateDebut() || undefined, fin: this.dateFin() || undefined };
    }
    return {};
  }

  private filtresActuels(): FiltresCommandesPartenaire {
    return { statut: this.filtreStatut(), ...this.parametresPeriodeActive() };
  }

  changerFiltre(statut: StatutCommande | ''): void {
    if (statut === this.filtreStatut()) {
      return;
    }
    this.filtreStatut.set(statut);
    this.chargerCommandes();
  }

  changerModePeriode(mode: ModePeriode): void {
    if (mode === this.modePeriode()) {
      return;
    }
    this.modePeriode.set(mode);
    // En mode "plage", on attend que les deux dates soient renseignées avant de recharger.
    if (mode !== 'plage' || (this.dateDebut() && this.dateFin())) {
      this.chargerCommandes();
      this.chargerResumePeriodeApresChangement();
    }
  }

  changerDateDebut(valeur: string): void {
    this.dateDebut.set(valeur);
    if (this.dateFin()) {
      this.chargerCommandes();
      this.chargerResumePeriodeApresChangement();
    }
  }

  changerDateFin(valeur: string): void {
    this.dateFin.set(valeur);
    if (this.dateDebut()) {
      this.chargerCommandes();
      this.chargerResumePeriodeApresChangement();
    }
  }

  /** La période affecte la rangée du haut, et le tableau s'il est ouvert sur cette rangée. */
  private chargerResumePeriodeApresChangement(): void {
    this.mesCommandesService.resume(this.parametresPeriodeActive()).subscribe({
      next: (resume) => this.resumePeriode.set(resume),
      error: () => {},
    });
    if (this.carteSelectionnee()?.rangee === 'periode') {
      this.chargerTable(true);
    }
  }

  changerOnglet(onglet: Onglet): void {
    this.onglet.set(onglet);
  }

  /** Réinitialise tous les filtres/sélections et recharge. */
  reinitialiserFiltres(): void {
    this.filtreStatut.set('');
    this.modePeriode.set('aujourdhui');
    this.dateDebut.set('');
    this.dateFin.set('');
    this.carteSelectionnee.set(null);
    this.chargerCommandes();
    this.chargerResumes();
  }

  // ---- Récap : ouverture / fermeture de la vue tableau ----

  ouvrirTable(rangee: RangeeCarte, groupe: GroupeCarte): void {
    this.carteSelectionnee.set({ rangee, groupe });
    this.pageTableIndex.set(0);
    this.chargerTable();
  }

  fermerTable(): void {
    this.carteSelectionnee.set(null);
    this.commandesTable.set([]);
    this.erreurTable.set(null);
  }

  chargerTable(silencieux = false): void {
    const carte = this.carteSelectionnee();
    const definition = this.definitionGroupeActuelle();
    if (!carte || !definition) {
      return;
    }
    if (!silencieux) {
      this.chargementTable.set(true);
      this.erreurTable.set(null);
    }

    const filtres: FiltresCommandesPartenaire =
      carte.rangee === 'periode'
        ? { statut: definition.statut ?? '', ...this.parametresPeriodeActive() }
        : { statut: definition.statut ?? '' };

    this.mesCommandesService.listerCommandesCompletes(filtres).subscribe({
      next: (commandes) => {
        this.chargementTable.set(false);
        this.commandesTable.set(commandes);
      },
      error: (erreur: unknown) => {
        this.chargementTable.set(false);
        if (!silencieux) {
          this.erreurTable.set(extraireMessageErreur(erreur));
        }
      },
    });
  }

  changerTri(colonne: ColonneTri): void {
    if (this.colonneTri() === colonne) {
      this.directionTri.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.colonneTri.set(colonne);
      this.directionTri.set('asc');
    }
    this.pageTableIndex.set(0);
  }

  pageTableSuivante(): void {
    if (this.pageTableIndex() < this.totalPagesTable() - 1) {
      this.pageTableIndex.update((p) => p + 1);
    }
  }

  pageTablePrecedente(): void {
    if (this.pageTableIndex() > 0) {
      this.pageTableIndex.update((p) => p - 1);
    }
  }

  // ---- Actions inline sur une ligne du tableau (transitions sans motif/confirmation) ----

  actionsInlineDisponibles(commande: Commande): ActionTransitionCommande[] {
    return TRANSITIONS_PARTENAIRE[commande.statut].filter((a) => !a.requiertMotif && !a.dangereuse);
  }

  appliquerTransitionInline(commande: Commande, action: ActionTransitionCommande): void {
    if (this.transitionInlineEnCoursId()) {
      return;
    }
    this.transitionInlineEnCoursId.set(commande.id);
    this.mesCommandesService.changerStatut(commande.id, action.cible).subscribe({
      next: (commandeMaj) => {
        this.transitionInlineEnCoursId.set(null);
        this.surCommandeMiseAJour(commandeMaj);
      },
      error: (erreur: unknown) => {
        this.transitionInlineEnCoursId.set(null);
        this.erreurTable.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Détail d'une commande ----

  ouvrirDetail(id: number): void {
    this.detailCommandeId.set(id);
    this.detailCommande.set(null);
    this.erreurDetail.set(null);
    this.chargementDetail.set(true);

    this.mesCommandesService.obtenirCommande(id).subscribe({
      next: (detail) => {
        this.chargementDetail.set(false);
        this.detailCommande.set(detail);
      },
      error: (erreur: unknown) => {
        this.chargementDetail.set(false);
        this.erreurDetail.set(extraireMessageErreur(erreur));
      },
    });
  }

  fermerDetail(): void {
    this.detailCommandeId.set(null);
    this.detailCommande.set(null);
    this.erreurDetail.set(null);
    this.chargementDetail.set(false);
  }

  surCommandeMiseAJour(commandeMaj: Commande): void {
    this.commandes.update((liste) => liste.map((c) => (c.id === commandeMaj.id ? commandeMaj : c)));
    this.chargerResumes();
    if (this.carteSelectionnee()) {
      this.chargerTable(true);
    }
    this.afficherMessageEphemere(
      `Commande ${commandeMaj.numero} mise à jour : ${this.libellesStatut[commandeMaj.statut]}.`,
    );
  }

  private afficherMessageEphemere(message: string): void {
    this.messageEphemere.set(message);
    clearTimeout(this.timerMessageEphemere);
    this.timerMessageEphemere = setTimeout(() => this.messageEphemere.set(null), 4000);
  }

  /** Date relative simple (à l'instant / il y a N min / il y a N h / il y a N j / date). */
  formaterDateRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  /** Formate une date au format input[type=date] (YYYY-MM-DD) en JJ/MM. */
  private formaterDateCourte(iso: string): string {
    const [annee, mois, jour] = iso.split('-');
    return annee && mois && jour ? `${jour}/${mois}` : iso;
  }

  /** Valeur affichée pour une carte de récap donnée. */
  valeurCarte(resume: ResumeCommandes | null, groupe: GroupeCarte): string {
    if (!resume) {
      return '—';
    }
    switch (groupe) {
      case 'nouvelle':
        return String(resume.nouvelles);
      case 'acceptee':
        return String(resume.acceptees);
      case 'en_preparation':
        return String(resume.en_preparation);
      case 'periode':
        return String(resume.total_aujourdhui);
      case 'ca':
        return `${resume.ca} FCFA`;
      case 'total':
        return String(resume.total);
    }
  }
}

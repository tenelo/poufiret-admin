import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';

import { CascadeGeographie } from '../cascade-geographie';
import { DialogGeographie } from '../dialog-geographie/dialog-geographie';
import { GeographieService, analyserErreurGeo } from '../geographie.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  CHAMP_NOM_ETAPE,
  CONFIG_NIVEAUX_GEO,
  CorpsGeo,
  ErreursGeo,
  FiltreActifGeo,
  FiltresGeo,
  LigneGeo,
  NiveauGeo,
} from '../../../../modeles/geographie.model';

const TAILLE_PAGE = 25;
const DEBOUNCE_RECHERCHE_MS = 350;
const DUREE_MESSAGE_MS = 4000;

interface ActionConfirmation {
  type: 'basculer' | 'supprimer';
  ligne: LigneGeo;
}

/**
 * Gestion d'un niveau de la géographie (régions, départements, localités ou
 * quartiers) : liste paginée filtrable (recherche, statut, parents en cascade),
 * export CSV, création/édition en dialog, activation/désactivation et
 * suppression avec confirmation. Un seul composant paramétré par `niveau`.
 */
@Component({
  selector: 'app-niveau-geographie',
  imports: [DialogGeographie],
  templateUrl: './niveau-geographie.html',
  styleUrl: './niveau-geographie.scss',
})
export class NiveauGeographie implements OnInit {
  private readonly service = inject(GeographieService);
  private readonly destroyRef = inject(DestroyRef);

  readonly niveau = input.required<NiveauGeo>();
  readonly config = computed(() => CONFIG_NIVEAUX_GEO[this.niveau()]);

  // Cascade des filtres parents ; créée à l'initialisation (dépend de `niveau`).
  cascade!: CascadeGeographie;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly lignes = signal<LigneGeo[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / TAILLE_PAGE)));

  readonly recherche = signal('');
  readonly filtreActif = signal<FiltreActifGeo>('');
  private readonly rechercheSubject = new Subject<void>();

  readonly exportEnCours = signal(false);

  // ---- Dialog de création / édition ----
  readonly dialogOuvert = signal(false);
  readonly ligneEnEdition = signal<LigneGeo | null>(null);
  readonly enregistrementEnCours = signal(false);
  readonly erreursDialog = signal<ErreursGeo | null>(null);

  // ---- Confirmations (activer/désactiver, supprimer) ----
  readonly confirmation = signal<ActionConfirmation | null>(null);
  readonly actionEnCours = signal(false);
  readonly conflitSuppression = signal<string | null>(null);
  readonly erreurConfirmation = signal<string | null>(null);

  // ---- Message éphémère (succès / erreur) ----
  readonly message = signal<{ texte: string; erreur: boolean } | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.cascade = new CascadeGeographie(this.service, this.config().cascade);
    this.cascade.demarrer();
    this.charger();

    this.rechercheSubject
      .pipe(debounceTime(DEBOUNCE_RECHERCHE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.charger();
      });
  }

  private filtresActuels(): FiltresGeo {
    return { search: this.recherche(), actif: this.filtreActif(), parent: this.cascade.parentId() };
  }

  charger(silencieux = false): void {
    if (!silencieux) {
      this.chargementEnCours.set(true);
    }
    this.erreurChargement.set(null);

    this.service.lister(this.niveau(), this.filtresActuels(), this.page(), TAILLE_PAGE).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.lignes.set(reponse.results);
        this.total.set(reponse.count);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Filtres ----

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
    this.rechercheSubject.next();
  }

  changerFiltreActif(valeur: string): void {
    this.filtreActif.set(valeur as FiltreActifGeo);
    this.page.set(1);
    this.charger();
  }

  /** Change un maillon de la cascade : réinitialise les suivants et recharge leurs options. */
  changerCascade(index: number, valeur: string): void {
    this.cascade.changer(index, valeur ? Number(valeur) : null);
    this.page.set(1);
    this.charger();
  }

  reinitialiserFiltres(): void {
    this.recherche.set('');
    this.filtreActif.set('');
    this.cascade.changer(0, null);
    this.page.set(1);
    this.charger();
  }

  pagePrecedente(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.charger();
    }
  }

  pageSuivante(): void {
    if (this.page() < this.nombrePages()) {
      this.page.update((p) => p + 1);
      this.charger();
    }
  }

  exporter(): void {
    if (this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.service.exporterCsv(this.niveau(), this.filtresActuels()).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.afficherMessage(extraireMessageErreur(erreur), true);
      },
    });
  }

  /** Nom de l'ancêtre affiché pour le maillon `index` de la cascade (le dernier est le parent direct). */
  nomAncetre(ligne: LigneGeo, index: number): string {
    const etapes = this.cascade.etapes;
    const valeur = index === etapes.length - 1 ? ligne.parent_nom : ligne[CHAMP_NOM_ETAPE[etapes[index]]];
    return valeur ? String(valeur) : '—';
  }

  // ---- Création / édition ----

  ouvrirCreation(): void {
    this.ligneEnEdition.set(null);
    this.erreursDialog.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(ligne: LigneGeo): void {
    this.ligneEnEdition.set(ligne);
    this.erreursDialog.set(null);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
  }

  enregistrer(corps: CorpsGeo): void {
    if (this.enregistrementEnCours()) {
      return;
    }
    this.enregistrementEnCours.set(true);
    this.erreursDialog.set(null);

    const edition = this.ligneEnEdition();
    const requete$ = edition
      ? this.service.modifier(this.niveau(), edition.id, corps)
      : this.service.creer(this.niveau(), corps);

    requete$.subscribe({
      next: (ligne) => {
        this.enregistrementEnCours.set(false);
        this.dialogOuvert.set(false);
        this.afficherMessage(`« ${ligne.nom} » ${edition ? 'modifié' : 'créé'} avec succès.`, false);
        this.charger(true);
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        const cascade = this.config().cascade;
        this.erreursDialog.set(analyserErreurGeo(erreur, cascade[cascade.length - 1]));
      },
    });
  }

  // ---- Confirmations ----

  demanderBascule(ligne: LigneGeo): void {
    this.reinitialiserConfirmation();
    this.confirmation.set({ type: 'basculer', ligne });
  }

  demanderSuppression(ligne: LigneGeo): void {
    this.reinitialiserConfirmation();
    this.confirmation.set({ type: 'supprimer', ligne });
  }

  annulerConfirmation(): void {
    this.confirmation.set(null);
  }

  private reinitialiserConfirmation(): void {
    this.conflitSuppression.set(null);
    this.erreurConfirmation.set(null);
  }

  confirmer(): void {
    const attente = this.confirmation();
    if (!attente || this.actionEnCours()) {
      return;
    }
    if (attente.type === 'basculer') {
      this.changerStatut(attente.ligne, !attente.ligne.actif);
    } else {
      this.supprimer(attente.ligne);
    }
  }

  /** Après un refus 409 : propose de désactiver l'élément plutôt que de le supprimer. */
  desactiverALaPlace(): void {
    const attente = this.confirmation();
    if (attente && !this.actionEnCours()) {
      this.changerStatut(attente.ligne, false);
    }
  }

  private changerStatut(ligne: LigneGeo, actif: boolean): void {
    this.actionEnCours.set(true);
    this.erreurConfirmation.set(null);

    this.service.modifier(this.niveau(), ligne.id, { actif }).subscribe({
      next: () => {
        this.actionEnCours.set(false);
        this.confirmation.set(null);
        this.afficherMessage(`« ${ligne.nom} » ${actif ? 'activé' : 'désactivé'}.`, false);
        this.charger(true);
      },
      error: (erreur: unknown) => {
        this.actionEnCours.set(false);
        this.erreurConfirmation.set(extraireMessageErreur(erreur));
      },
    });
  }

  private supprimer(ligne: LigneGeo): void {
    this.actionEnCours.set(true);
    this.erreurConfirmation.set(null);
    this.conflitSuppression.set(null);

    this.service.supprimer(this.niveau(), ligne.id).subscribe({
      next: () => {
        this.actionEnCours.set(false);
        this.confirmation.set(null);
        this.afficherMessage(`« ${ligne.nom} » supprimé.`, false);
        // Dernière ligne de la page supprimée : on revient à la page précédente.
        if (this.lignes().length === 1 && this.page() > 1) {
          this.page.update((p) => p - 1);
        }
        this.charger(true);
      },
      error: (erreur: unknown) => {
        this.actionEnCours.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
          this.conflitSuppression.set(extraireMessageErreur(erreur));
        } else {
          this.erreurConfirmation.set(extraireMessageErreur(erreur));
        }
      },
    });
  }

  private afficherMessage(texte: string, erreur: boolean): void {
    this.message.set({ texte, erreur });
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.message.set(null), DUREE_MESSAGE_MS);
  }
}

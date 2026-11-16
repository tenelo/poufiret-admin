import { Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { PublicitesAdminService } from './publicites-admin.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { QuotasFormules } from '../quotas-formules/quotas-formules';
import { StatsPublicite } from '../../../partage/stats-publicite/stats-publicite';
import { InterrupteurStatsVisibles } from './interrupteur-stats-visibles/interrupteur-stats-visibles';
import { BarreFiltresPublicitesAdmin, PartenaireActifFiltre } from './filtres-publicites-admin/filtres-publicites-admin';
import {
  PaginationPublicitesAdmin,
  ChangementTriPublicitesAdmin,
} from './pagination-publicites-admin/pagination-publicites-admin';
import { TableauPublicitesAdmin } from './tableau-publicites-admin/tableau-publicites-admin';
import { DialogPubPartenaire, ModeDialogPubPartenaire } from './dialog-pub-partenaire/dialog-pub-partenaire';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { couleursGraphique, formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import { LIBELLES_PORTEE, PorteePublicite } from '../../../modeles/publicite.model';
import {
  ActionTransitionPubliciteAdmin,
  ChampTriPubliciteAdmin,
  CompteursStatutPubliciteAdmin,
  FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT,
  FiltresListePublicitesAdmin,
  FiltresPublicitesAdmin,
  FiltresRecherchePublicitesAdmin,
  LIBELLES_STATUT_PUBLICITE_ADMIN,
  ONGLETS_STATUT_PUBLICITE_ADMIN,
  OngletStatutPubliciteAdmin,
  OPTIONS_EXPORT_PUBLICITES,
  OPTIONS_TRI_PUBLICITE_ADMIN,
  OriginePubliciteAdmin,
  PubliciteAdmin,
  QuotaFormule,
  ReponseListePublicitesAdmin,
  StatsPublicitesAdmin,
  StatutPubliciteAdmin,
  TAILLES_PAGE_PUBLICITES_ADMIN,
  TRANSITIONS_ADMIN_PUBLICITE,
  TypeExportPublicites,
} from '../../../modeles/publicites-admin.model';

interface ActionEnAttenteConfirmation {
  publicite: PubliciteAdmin;
  action: ActionTransitionPubliciteAdmin;
}

export type ModeAffichagePublicitesAdmin = 'cartes' | 'tableau';

const CLE_MODE_AFFICHAGE = 'poufiret-admin-publicites-mode-affichage';

function lireModeAffichageStocke(): ModeAffichagePublicitesAdmin | null {
  try {
    const valeur = localStorage.getItem(CLE_MODE_AFFICHAGE);
    return valeur === 'cartes' || valeur === 'tableau' ? valeur : null;
  } catch {
    return null;
  }
}

function ecrireModeAffichageStocke(mode: ModeAffichagePublicitesAdmin): void {
  try {
    localStorage.setItem(CLE_MODE_AFFICHAGE, mode);
  } catch {
    // Stockage indisponible (navigation privée, quota...) : pas bloquant, le mode reste en mémoire.
  }
}

/**
 * Écran admin "Publicités" (onglet Campagnes) : stats globales en lecture seule (GET
 * /publicites/admin/stats/, totaux uniquement) + liste paginée, triable, filtrable
 * (GET /publicites/admin/liste/) + modération des campagnes (transitions de statut).
 * Filtres/tri/page/mode d'affichage sont reflétés dans l'URL (query params) pour qu'un
 * rechargement ou un lien garde la vue ; le mode d'affichage est en plus mémorisé dans
 * `localStorage`.
 */
@Component({
  selector: 'app-publicites-admin',
  imports: [
    NgTemplateOutlet,
    Graphique,
    QuotasFormules,
    BarreFiltresPublicitesAdmin,
    PaginationPublicitesAdmin,
    TableauPublicitesAdmin,
    InterrupteurStatsVisibles,
    StatsPublicite,
    DialogPubPartenaire,
  ],
  templateUrl: './publicites-admin.html',
  styleUrl: './publicites-admin.scss',
})
export class PublicitesAdmin implements OnInit, OnDestroy {
  private readonly service = inject(PublicitesAdminService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ---- Bande de totaux (GET admin/stats/, totaux uniquement) ----
  readonly chargementStatsEnCours = signal(true);
  readonly erreurStats = signal<string | null>(null);
  readonly statsEnTete = signal<StatsPublicitesAdmin | null>(null);
  private derniersFiltresStats: FiltresPublicitesAdmin | null = null;

  // ---- Liste paginée (GET admin/liste/) ----
  readonly chargementListeEnCours = signal(true);
  readonly erreurListe = signal<string | null>(null);
  readonly reponseListe = signal<ReponseListePublicitesAdmin | null>(null);
  readonly compteurs = computed<CompteursStatutPubliciteAdmin | null>(
    () => this.reponseListe()?.compteurs_statut ?? null,
  );

  readonly filtres = signal<FiltresListePublicitesAdmin>(FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT);
  readonly optionsTri = OPTIONS_TRI_PUBLICITE_ADMIN;

  readonly formulesQuotas = signal<QuotaFormule[]>([]);
  private readonly quotas = viewChild(QuotasFormules);
  private abonnementListe?: Subscription;
  private abonnementStats?: Subscription;
  private abonnementPubCiblee?: Subscription;
  private abonnementRoute?: Subscription;
  private premierChargement = true;

  // Arrivée depuis une notification ou un lien (?statut / ?pub) : onglet de statut imposé,
  // campagne à mettre en évidence si elle est sur la page chargée, sinon chargée à part.
  readonly statutImpose = signal<{ statut: OngletStatutPubliciteAdmin } | null>(null);
  readonly pubMiseEnEvidence = signal<string | null>(null);
  readonly pubCiblee = signal<PubliciteAdmin | null>(null);

  // Arrivée depuis l'onglet Partenaires (?partenaire=<id>&partenaireNom=<nom>).
  private readonly partenaireNomQuery = signal<string | null>(null);
  readonly partenaireActif = computed<PartenaireActifFiltre | null>(() => {
    const id = this.filtres().partenaireId;
    if (id === null) {
      return null;
    }
    const nom = this.partenaireNomQuery() ?? this.reponseListe()?.results[0]?.partenaire_nom ?? null;
    return { id, nom: nom ?? `#${id}` };
  });

  // ---- Mode d'affichage (Cartes / Tableau), mémorisé dans localStorage ----
  readonly modeAffichage = signal<ModeAffichagePublicitesAdmin>('cartes');

  readonly formaterNombre = formaterNombre;
  readonly libellesStatut = LIBELLES_STATUT_PUBLICITE_ADMIN;
  readonly libellesPortee = LIBELLES_PORTEE;
  readonly optionsExport = OPTIONS_EXPORT_PUBLICITES;

  readonly menuExportOuvert = signal(false);
  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  readonly transitionEnCoursId = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);
  readonly actionAConfirmer = signal<ActionEnAttenteConfirmation | null>(null);

  // ---- Interrupteur « Stats visibles par le partenaire » ----
  readonly statsAConfirmer = signal<{ publicite: PubliciteAdmin; visible: boolean } | null>(null);
  readonly statsEnCoursId = signal<string | null>(null);

  // ---- Visuel (image/vidéo) de la campagne, agrandi dans une lightbox maison ----
  readonly mediaAgrandi = signal<PubliciteAdmin | null>(null);
  // Ids des campagnes dont l'image a échoué au chargement (repli sur le placeholder).
  private readonly imagesEnErreur = signal<ReadonlySet<string>>(new Set());

  readonly peutExporter = computed(() => this.permissionsService.aLaCapacite('exporter_csv'));
  readonly infobulleExport = computed(() =>
    this.peutExporter() ? '' : "Vous n'avez pas la capacité exporter_csv.",
  );
  readonly peutModerer = computed(() => this.permissionsService.aLaCapacite('valider_publicite'));
  /** Créer / reconduire une pub pour un partenaire : capacité gerer_pubs_partenaires ou super-admin. */
  readonly peutGererPubsPartenaires = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('gerer_pubs_partenaires'),
  );

  // ---- Fenêtre « Créer une pub pour un partenaire » / « Reconduire » ----
  readonly dialogPubPartenaire = signal<{ mode: ModeDialogPubPartenaire; publicite: PubliciteAdmin | null } | null>(
    null,
  );

  readonly optionsDonut: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  // Calculé depuis compteurs_statut (pas depuis la page chargée) : exact même sous pagination.
  readonly donneesStatuts = computed<ChartConfiguration['data']>(() => {
    const compteurs = this.compteurs();
    const statuts: Exclude<StatutPubliciteAdmin, 'brouillon'>[] = [
      'en_attente_paiement',
      'en_attente_validation',
      'active',
      'terminee',
      'rejetee',
    ];
    const entrees = statuts
      .map((statut) => [statut, compteurs?.[statut] ?? 0] as const)
      .filter(([, valeur]) => valeur > 0);
    return {
      labels: entrees.map(([statut]) => this.libellesStatut[statut]),
      datasets: [
        {
          data: entrees.map(([, valeur]) => valeur),
          backgroundColor: couleursGraphique(entrees.length),
        },
      ],
    };
  });

  ngOnInit(): void {
    this.abonnementRoute = this.route.queryParamMap.subscribe((params) => {
      const statut =
        ONGLETS_STATUT_PUBLICITE_ADMIN.find((o) => o.valeur === params.get('statut'))?.valeur ??
        FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT.statut;

      const ordreBrut = params.get('ordre');
      let champTri = FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT.champTri;
      let triDescendant = FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT.triDescendant;
      if (ordreBrut) {
        const descendant = ordreBrut.startsWith('-');
        const champ = (descendant ? ordreBrut.slice(1) : ordreBrut) as ChampTriPubliciteAdmin;
        if (OPTIONS_TRI_PUBLICITE_ADMIN.some((o) => o.valeur === champ)) {
          champTri = champ;
          triDescendant = descendant;
        }
      }

      const pageSizeBrut = Number(params.get('pageSize'));
      const pageSize = (TAILLES_PAGE_PUBLICITES_ADMIN as readonly number[]).includes(pageSizeBrut)
        ? pageSizeBrut
        : FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT.pageSize;
      const pageBrute = Number(params.get('page'));
      const page = Number.isInteger(pageBrute) && pageBrute > 0 ? pageBrute : 1;
      const partenaireIdBrut = params.get('partenaire');
      const partenaireId = partenaireIdBrut !== null && partenaireIdBrut !== '' ? Number(partenaireIdBrut) : null;

      const nouveauxFiltres: FiltresListePublicitesAdmin = {
        statut,
        recherche: params.get('recherche') ?? '',
        formule: params.get('formule') ?? '',
        portee: (params.get('portee') as PorteePublicite | null) ?? '',
        partenaireId,
        dateDebut: params.get('dateDebut') ?? '',
        dateFin: params.get('dateFin') ?? '',
        origine: (params.get('origine')?.split(',').filter(Boolean) ?? []) as OriginePubliciteAdmin[],
        champTri,
        triDescendant,
        page,
        pageSize,
      };

      this.filtres.set(nouveauxFiltres);
      this.statutImpose.set({ statut: nouveauxFiltres.statut });
      this.partenaireNomQuery.set(params.get('partenaireNom'));
      this.pubMiseEnEvidence.set(params.get('pub'));

      const modeParam = params.get('mode');
      if (modeParam === 'cartes' || modeParam === 'tableau') {
        this.modeAffichage.set(modeParam);
      } else if (this.premierChargement) {
        const stocke = lireModeAffichageStocke();
        if (stocke) {
          this.modeAffichage.set(stocke);
        }
      }
      this.premierChargement = false;

      this.chargerListe();
      const filtresStats: FiltresPublicitesAdmin = {
        statut: nouveauxFiltres.statut,
        recherche: nouveauxFiltres.recherche,
        formule: nouveauxFiltres.formule,
        portee: nouveauxFiltres.portee,
      };
      if (!this.memesFiltresStats(filtresStats)) {
        this.derniersFiltresStats = filtresStats;
        this.chargerStatsEnTete(filtresStats);
      }
    });
  }

  ngOnDestroy(): void {
    this.abonnementListe?.unsubscribe();
    this.abonnementStats?.unsubscribe();
    this.abonnementPubCiblee?.unsubscribe();
    this.abonnementRoute?.unsubscribe();
  }

  private memesFiltresStats(f: FiltresPublicitesAdmin): boolean {
    const d = this.derniersFiltresStats;
    return !!d && d.statut === f.statut && d.recherche === f.recherche && d.formule === f.formule && d.portee === f.portee;
  }

  private chargerListe(silencieux = false): void {
    if (!silencieux) {
      this.chargementListeEnCours.set(true);
    }
    this.erreurListe.set(null);

    this.abonnementListe?.unsubscribe();
    this.abonnementListe = this.service.chargerListe(this.filtres()).subscribe({
      next: (reponse) => {
        this.chargementListeEnCours.set(false);
        this.reponseListe.set(reponse);
        this.traiterPubCiblee();
      },
      error: (erreur: unknown) => {
        this.chargementListeEnCours.set(false);
        this.erreurListe.set(extraireMessageErreur(erreur));
      },
    });
  }

  private chargerStatsEnTete(filtres: FiltresPublicitesAdmin, silencieux = false): void {
    if (!silencieux) {
      this.chargementStatsEnCours.set(true);
    }
    this.erreurStats.set(null);

    this.abonnementStats?.unsubscribe();
    this.abonnementStats = this.service.chargerStats(filtres).subscribe({
      next: (donnees) => {
        this.chargementStatsEnCours.set(false);
        this.statsEnTete.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementStatsEnCours.set(false);
        this.erreurStats.set(extraireMessageErreur(erreur));
      },
    });
  }

  /**
   * Campagne ciblée par une notification/un lien (?pub=<id>) : si elle est sur la page chargée,
   * simple surlignage + défilement (comme avant) ; sinon chargée à part (encadré « Campagne
   * ciblée »), sans dupliquer la carte. Silencieux si introuvable (pas d'erreur bloquante).
   */
  private traiterPubCiblee(): void {
    const id = this.pubMiseEnEvidence();
    if (!id) {
      this.pubCiblee.set(null);
      return;
    }
    const surLaPage = this.reponseListe()?.results.some((p) => p.id === id) ?? false;
    if (surLaPage) {
      this.pubCiblee.set(null);
      this.faireDefilerVersPubMiseEnEvidence();
      return;
    }
    this.abonnementPubCiblee?.unsubscribe();
    this.abonnementPubCiblee = this.service.chargerPubParId(id).subscribe({
      next: (pub) => this.pubCiblee.set(pub),
      error: () => this.pubCiblee.set(null),
    });
  }

  private faireDefilerVersPubMiseEnEvidence(): void {
    const id = this.pubMiseEnEvidence();
    if (!id) {
      return;
    }
    setTimeout(() => {
      document.getElementById('pub-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /** Ferme l'encadré « Campagne ciblée » : retire `pub` de l'URL. */
  fermerPubCiblee(): void {
    this.naviguer(this.filtres(), { retirerPub: true });
  }

  surFiltres(nouveaux: FiltresRecherchePublicitesAdmin): void {
    this.naviguer(
      { ...this.filtres(), ...nouveaux, page: 1 },
      { partenaireNom: nouveaux.partenaireId !== null ? this.partenaireNomQuery() : null },
    );
  }

  surTri(changement: ChangementTriPublicitesAdmin): void {
    this.naviguer({
      ...this.filtres(),
      champTri: changement.champ as ChampTriPubliciteAdmin,
      triDescendant: changement.descendant,
      page: 1,
    });
  }

  surPageSize(taille: number): void {
    this.naviguer({ ...this.filtres(), pageSize: taille, page: 1 });
  }

  surPage(page: number): void {
    this.naviguer({ ...this.filtres(), page });
  }

  basculerMode(mode: ModeAffichagePublicitesAdmin): void {
    if (this.modeAffichage() === mode) {
      return;
    }
    this.modeAffichage.set(mode);
    ecrireModeAffichageStocke(mode);
    this.naviguer(this.filtres());
  }

  private naviguer(
    filtres: FiltresListePublicitesAdmin,
    options: { partenaireNom?: string | null; retirerPub?: boolean } = {},
  ): void {
    const partenaireNom = options.partenaireNom !== undefined ? options.partenaireNom : this.partenaireNomQuery();
    const pub = options.retirerPub ? null : this.pubMiseEnEvidence();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.construireQueryParams(filtres, this.modeAffichage(), partenaireNom, pub),
    });
  }

  private construireQueryParams(
    f: FiltresListePublicitesAdmin,
    mode: ModeAffichagePublicitesAdmin,
    partenaireNom: string | null,
    pub: string | null,
  ): Params {
    const DEFAUT = FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT;
    const ordre = `${f.triDescendant ? '-' : ''}${f.champTri}`;
    const ordreDefaut = `${DEFAUT.triDescendant ? '-' : ''}${DEFAUT.champTri}`;
    return {
      statut: f.statut !== DEFAUT.statut ? f.statut : null,
      recherche: f.recherche || null,
      formule: f.formule || null,
      portee: f.portee || null,
      partenaire: f.partenaireId ?? null,
      partenaireNom: f.partenaireId !== null ? partenaireNom : null,
      dateDebut: f.dateDebut || null,
      dateFin: f.dateFin || null,
      origine: f.origine.length ? f.origine.join(',') : null,
      ordre: ordre !== ordreDefaut ? ordre : null,
      page: f.page > 1 ? f.page : null,
      pageSize: f.pageSize !== DEFAUT.pageSize ? f.pageSize : null,
      mode: mode !== 'cartes' ? mode : null,
      pub,
    };
  }

  /** `silencieux` : recharge sans remplacer l'affichage par le spinner. */
  rafraichir(): void {
    this.chargerListe(true);
    const f = this.filtres();
    this.chargerStatsEnTete({ statut: f.statut, recherche: f.recherche, formule: f.formule, portee: f.portee }, true);
    this.quotas()?.charger();
  }

  /** Recharge la liste et les compteurs après une action (reconduction, transition…), même page. */
  private rechargerApresAction(): void {
    this.chargerListe(true);
    const f = this.filtres();
    this.chargerStatsEnTete({ statut: f.statut, recherche: f.recherche, formule: f.formule, portee: f.portee }, true);
    this.quotas()?.charger();
  }

  private patcherPub(id: string, patch: Partial<PubliciteAdmin>): void {
    this.reponseListe.update((r) =>
      r ? { ...r, results: r.results.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : r,
    );
    this.pubCiblee.update((p) => (p && p.id === id ? { ...p, ...patch } : p));
  }

  /** Portée effective de la campagne (à défaut, la portée choisie), libellée. */
  libellePortee(publicite: PubliciteAdmin): string | null {
    const portee = publicite.portee_effective ?? publicite.portee;
    return portee ? this.libellesPortee[portee] : null;
  }

  // ---- Reconduction ----

  /** Bouton « Reconduire » : campagne terminée, et le backend ne l'interdit pas déjà (copie en cours). */
  peutReconduire(publicite: PubliciteAdmin): boolean {
    return publicite.statut === 'terminee' && publicite.peut_etre_reconduite !== false;
  }

  formaterDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  /** Libellé français d'un statut (helper plutôt qu'un index direct : évite un `any` implicite
   *  côté template, `pub` n'étant pas fortement typé dans le contexte du `#carteTemplate`). */
  statutLibelle(statut: StatutPubliciteAdmin): string {
    return this.libellesStatut[statut];
  }

  /** Vrai si l'original d'une copie est présent dans la liste actuellement chargée (clic possible). */
  originalDisponible(publicite: PubliciteAdmin): boolean {
    const id = publicite.reconduite_depuis_id;
    return !!id && (this.reponseListe()?.results.some((p) => p.id === id) ?? false);
  }

  /** Amène l'original de cette copie dans la vue, s'il est dans la liste actuellement chargée. */
  allerVersOriginal(publicite: PubliciteAdmin): void {
    const id = publicite.reconduite_depuis_id;
    if (id) {
      document.getElementById('pub-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ---- Pub créée ou reconduite pour un partenaire ----

  ouvrirCreationPubPartenaire(): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.dialogPubPartenaire.set({ mode: 'creation', publicite: null });
  }

  ouvrirReconduction(publicite: PubliciteAdmin): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.dialogPubPartenaire.set({ mode: 'reconduction', publicite });
  }

  fermerDialogPubPartenaire(): void {
    this.dialogPubPartenaire.set(null);
  }

  /** Succès : message, liste des campagnes et quotas des formules rafraîchis (même page). */
  surPubPartenaireReussie(message: string): void {
    this.dialogPubPartenaire.set(null);
    this.messageSucces.set(message);
    this.rechargerApresAction();
  }

  // ---- Stats visibles par le partenaire (campagnes actives ou terminées) ----

  peutBasculerStats(publicite: PubliciteAdmin): boolean {
    return publicite.statut === 'active' || publicite.statut === 'terminee';
  }

  /** Absent (ancien backend) = visibles, comme le comportement historique. */
  statsVisibles(publicite: PubliciteAdmin): boolean {
    return publicite.stats_visibles_partenaire ?? true;
  }

  demanderBasculeStats(publicite: PubliciteAdmin, visible: boolean): void {
    this.messageErreur.set(null);
    this.statsAConfirmer.set({ publicite, visible });
  }

  annulerBasculeStats(): void {
    this.statsAConfirmer.set(null);
  }

  confirmerBasculeStats(): void {
    const attente = this.statsAConfirmer();
    if (!attente) {
      return;
    }
    this.statsAConfirmer.set(null);

    const { publicite, visible } = attente;
    this.statsEnCoursId.set(publicite.id);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.service.basculerStatsVisibles(publicite.id, visible).subscribe({
      next: () => {
        this.statsEnCoursId.set(null);
        this.patcherPub(publicite.id, { stats_visibles_partenaire: visible });
        this.messageSucces.set(
          visible
            ? `Les stats de « ${publicite.titre} » sont maintenant visibles par le partenaire.`
            : `Les stats de « ${publicite.titre} » sont maintenant masquées au partenaire.`,
        );
      },
      // Message du backend tel quel (403, 404...).
      error: (erreur: unknown) => {
        this.statsEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  actionsDisponibles(publicite: PubliciteAdmin): ActionTransitionPubliciteAdmin[] {
    return TRANSITIONS_ADMIN_PUBLICITE[publicite.statut];
  }

  // ---- Visuel (image/vidéo) ----

  /** Image utilisable : présente et pas déjà signalée en échec de chargement. */
  imageValide(publicite: PubliciteAdmin): boolean {
    return !!publicite.image_couverture && !this.imagesEnErreur().has(publicite.id);
  }

  aUnVisuel(publicite: PubliciteAdmin): boolean {
    return this.imageValide(publicite) || !!publicite.video;
  }

  surErreurImage(id: string): void {
    this.imagesEnErreur.update((ensemble) => new Set(ensemble).add(id));
  }

  ouvrirMedia(publicite: PubliciteAdmin): void {
    if (this.aUnVisuel(publicite)) {
      this.mediaAgrandi.set(publicite);
    }
  }

  fermerMedia(): void {
    this.mediaAgrandi.set(null);
  }

  basculerMenuExport(): void {
    this.menuExportOuvert.update((v) => !v);
  }

  exporter(type: TypeExportPublicites): void {
    this.menuExportOuvert.set(false);
    if (!this.peutExporter() || this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv(type).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }

  demanderAction(publicite: PubliciteAdmin, action: ActionTransitionPubliciteAdmin): void {
    this.messageErreur.set(null);
    this.actionAConfirmer.set({ publicite, action });
  }

  annulerAction(): void {
    this.actionAConfirmer.set(null);
  }

  confirmerAction(): void {
    const attente = this.actionAConfirmer();
    if (!attente) {
      return;
    }
    this.actionAConfirmer.set(null);

    const { publicite, action } = attente;
    this.transitionEnCoursId.set(publicite.id);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.service.appliquerTransition(publicite.id, action.cible).subscribe({
      next: (reponse) => {
        this.transitionEnCoursId.set(null);
        // La pub change d'onglet et libère/occupe une place : on recharge la liste et les quotas.
        this.rechargerApresAction();
        this.messageSucces.set(
          reponse.message || `« ${action.libelle} » appliqué avec succès à « ${publicite.titre} ».`,
        );
      },
      error: (erreur: unknown) => {
        this.transitionEnCoursId.set(null);
        this.messageErreur.set(this.extraireMessageErreurTransition(erreur));
      },
    });
  }

  private extraireMessageErreurTransition(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
      const corps = erreur.error;
      const messageBackend =
        typeof corps?.message === 'string'
          ? corps.message
          : typeof corps?.detail === 'string'
            ? corps.detail
            : null;
      return messageBackend ?? 'Quota de la formule atteint.';
    }
    return extraireMessageErreur(erreur);
  }
}

import { Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { PublicitesAdminService } from './publicites-admin.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { QuotasFormules } from '../quotas-formules/quotas-formules';
import { StatsPublicite } from '../../../partage/stats-publicite/stats-publicite';
import { InterrupteurStatsVisibles } from './interrupteur-stats-visibles/interrupteur-stats-visibles';
import { BarreFiltresPublicitesAdmin } from './filtres-publicites-admin/filtres-publicites-admin';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { couleursGraphique, formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import { LIBELLES_PORTEE } from '../../../modeles/publicite.model';
import {
  ActionTransitionPubliciteAdmin,
  ONGLETS_STATUT_PUBLICITE_ADMIN,
  OngletStatutPubliciteAdmin,
  CompteursStatutPubliciteAdmin,
  FILTRES_PUBLICITES_ADMIN_DEFAUT,
  FiltresPublicitesAdmin,
  LIBELLES_STATUT_PUBLICITE_ADMIN,
  OPTIONS_EXPORT_PUBLICITES,
  PubliciteAdmin,
  QuotaFormule,
  StatsPublicitesAdmin,
  StatutPubliciteAdmin,
  TRANSITIONS_ADMIN_PUBLICITE,
  TypeExportPublicites,
} from '../../../modeles/publicites-admin.model';

interface ActionEnAttenteConfirmation {
  publicite: PubliciteAdmin;
  action: ActionTransitionPubliciteAdmin;
}

/**
 * Écran admin "Publicités" : stats globales en lecture seule + modération des
 * campagnes (transitions de statut) (GET /publicites/admin/stats/,
 * POST /publicites/<id>/transition/<action>/).
 */
@Component({
  selector: 'app-publicites-admin',
  imports: [Graphique, QuotasFormules, BarreFiltresPublicitesAdmin, InterrupteurStatsVisibles, StatsPublicite],
  templateUrl: './publicites-admin.html',
  styleUrl: './publicites-admin.scss',
})
export class PublicitesAdmin implements OnInit, OnDestroy {
  private readonly service = inject(PublicitesAdminService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly donnees = signal<StatsPublicitesAdmin | null>(null);

  // Onglet (statut) + filtres, envoyés à l'API. Défaut : "En attente de validation".
  private readonly filtres = signal<FiltresPublicitesAdmin>(FILTRES_PUBLICITES_ADMIN_DEFAUT);
  // Les compteurs ignorent le filtre de statut : on garde les derniers reçus pour les onglets.
  readonly compteurs = signal<CompteursStatutPubliciteAdmin | null>(null);
  readonly formulesQuotas = signal<QuotaFormule[]>([]);
  private readonly quotas = viewChild(QuotasFormules);
  private abonnementChargement?: Subscription;
  private abonnementRoute?: Subscription;

  // Arrivée depuis une notification : onglet de statut imposé et campagne à mettre en évidence.
  readonly statutImpose = signal<{ statut: OngletStatutPubliciteAdmin } | null>(null);
  readonly pubMiseEnEvidence = signal<string | null>(null);

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

  readonly optionsDonut: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  readonly donneesStatuts = computed<ChartConfiguration['data']>(() => {
    const publicites = this.donnees()?.publicites ?? [];
    const parStatut = new Map<StatutPubliciteAdmin, number>();
    for (const pub of publicites) {
      parStatut.set(pub.statut, (parStatut.get(pub.statut) ?? 0) + 1);
    }
    const entrees = [...parStatut.entries()];
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
    // Paramètres de route optionnels : ?statut=<onglet>&pub=<uuid> (ex. depuis la cloche admin).
    // L'émission initiale déclenche le premier chargement ; les suivantes couvrent une navigation
    // vers la même page avec d'autres paramètres.
    this.abonnementRoute = this.route.queryParamMap.subscribe((params) => {
      const statut = params.get('statut');
      const onglet = ONGLETS_STATUT_PUBLICITE_ADMIN.find((o) => o.valeur === statut)?.valeur ?? null;
      if (onglet) {
        this.statutImpose.set({ statut: onglet });
        this.filtres.update((f) => ({ ...f, statut: onglet }));
      }
      this.pubMiseEnEvidence.set(params.get('pub'));
      this.charger();
    });
  }

  ngOnDestroy(): void {
    this.abonnementChargement?.unsubscribe();
    this.abonnementRoute?.unsubscribe();
  }

  /** `silencieux` : recharge la liste sans remplacer l'affichage par le spinner. */
  charger(silencieux = false): void {
    if (!silencieux) {
      this.chargementEnCours.set(true);
    }
    this.erreurChargement.set(null);

    // Une réponse plus ancienne ne doit pas écraser celle d'un filtre plus récent.
    this.abonnementChargement?.unsubscribe();
    this.abonnementChargement = this.service.chargerStats(this.filtres()).subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
        if (donnees.compteurs_statut) {
          this.compteurs.set(donnees.compteurs_statut);
        }
        this.faireDefilerVersPubMiseEnEvidence();
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  /** Amène la campagne mise en évidence dans la vue, une fois la liste affichée. */
  private faireDefilerVersPubMiseEnEvidence(): void {
    const id = this.pubMiseEnEvidence();
    if (!id) {
      return;
    }
    setTimeout(() => {
      document.getElementById('pub-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  surFiltres(filtres: FiltresPublicitesAdmin): void {
    this.filtres.set(filtres);
    this.charger();
  }

  rafraichir(): void {
    this.charger();
    this.quotas()?.charger();
  }

  /** Portée effective de la campagne (à défaut, la portée choisie), libellée. */
  libellePortee(publicite: PubliciteAdmin): string | null {
    const portee = publicite.portee_effective ?? publicite.portee;
    return portee ? this.libellesPortee[portee] : null;
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
        this.donnees.update((d) =>
          d
            ? {
                ...d,
                publicites: d.publicites.map((p) =>
                  p.id === publicite.id ? { ...p, stats_visibles_partenaire: visible } : p,
                ),
              }
            : d,
        );
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
        this.charger(true);
        this.quotas()?.charger();
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

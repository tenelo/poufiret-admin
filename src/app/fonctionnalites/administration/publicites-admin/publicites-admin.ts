import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChartConfiguration } from 'chart.js';

import { PublicitesAdminService } from './publicites-admin.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { couleursGraphique, formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import {
  ActionTransitionPubliciteAdmin,
  LIBELLES_STATUT_PUBLICITE_ADMIN,
  OPTIONS_EXPORT_PUBLICITES,
  PubliciteAdmin,
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
  imports: [Graphique, DatePipe],
  templateUrl: './publicites-admin.html',
  styleUrl: './publicites-admin.scss',
})
export class PublicitesAdmin implements OnInit {
  private readonly service = inject(PublicitesAdminService);
  private readonly permissionsService = inject(PermissionsService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly donnees = signal<StatsPublicitesAdmin | null>(null);

  readonly formaterNombre = formaterNombre;
  readonly libellesStatut = LIBELLES_STATUT_PUBLICITE_ADMIN;
  readonly optionsExport = OPTIONS_EXPORT_PUBLICITES;

  readonly menuExportOuvert = signal(false);
  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  readonly transitionEnCoursId = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);
  readonly actionAConfirmer = signal<ActionEnAttenteConfirmation | null>(null);

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
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.chargerStats().subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  actionsDisponibles(publicite: PubliciteAdmin): ActionTransitionPubliciteAdmin[] {
    return TRANSITIONS_ADMIN_PUBLICITE[publicite.statut];
  }

  entreesImpressionsParType(impressions: Record<string, number> | undefined): { type: string; valeur: number }[] {
    return Object.entries(impressions ?? {}).map(([type, valeur]) => ({ type, valeur }));
  }

  pourcentageBarre(valeur: number, impressions: Record<string, number> | undefined): number {
    const maxValeur = Math.max(1, ...Object.values(impressions ?? {}));
    return Math.round((valeur / maxValeur) * 100);
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
        this.mettreAJourStatut(publicite.id, reponse.statut as StatutPubliciteAdmin);
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

  private mettreAJourStatut(id: string, statut: StatutPubliciteAdmin): void {
    this.donnees.update((d) => {
      if (!d) {
        return d;
      }
      return {
        ...d,
        publicites: d.publicites.map((p) => (p.id === id ? { ...p, statut } : p)),
      };
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

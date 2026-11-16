import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { PublicitesAdmin } from '../publicites-admin';
import { FormulesParametresPub } from '../formules-parametres-pub/formules-parametres-pub';
import { StatistiquesPub } from '../statistiques-pub/statistiques-pub';
import { PartenairesPublicitesAdmin } from '../partenaires-publicites-admin/partenaires-publicites-admin';
import { PubsPoufiret } from '../pubs-poufiret/pubs-poufiret';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';

type OngletPublicitesAdmin = 'campagnes' | 'statistiques' | 'formules' | 'partenaires' | 'poufiret';

/**
 * Page admin "Publicités" : onglet « Campagnes » (l'écran historique), onglet « Statistiques »
 * et « Par partenaire » (capacité voir_stats ou super-admin), onglet « Formules & paramètres »
 * (capacité gerer_formules_pub ou super-admin) et onglet « Pubs Poufiret » (capacité
 * gerer_pubs_poufiret ou super-admin). Sans droit sur les onglets supplémentaires, la page
 * s'affiche comme avant, sans barre d'onglets.
 */
@Component({
  selector: 'app-publicites-admin-onglets',
  imports: [PublicitesAdmin, FormulesParametresPub, StatistiquesPub, PartenairesPublicitesAdmin, PubsPoufiret],
  templateUrl: './publicites-admin-onglets.html',
  styleUrl: './publicites-admin-onglets.scss',
})
export class PublicitesAdminOnglets {
  private readonly permissionsService = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);

  readonly ongletActif = signal<OngletPublicitesAdmin>('campagnes');

  private readonly estSuperAdmin = computed(
    () => this.permissionsService.permissionsActuelles()?.isSuperuser ?? false,
  );

  readonly peutVoirStatistiques = computed(
    () => this.estSuperAdmin() || this.permissionsService.aLaCapacite('voir_stats'),
  );

  readonly peutGererFormules = computed(
    () => this.estSuperAdmin() || this.permissionsService.aLaCapacite('gerer_formules_pub'),
  );

  readonly peutGererPubsPoufiret = computed(
    () => this.estSuperAdmin() || this.permissionsService.aLaCapacite('gerer_pubs_poufiret'),
  );

  readonly barreVisible = computed(
    () => this.peutVoirStatistiques() || this.peutGererFormules() || this.peutGererPubsPoufiret(),
  );

  constructor() {
    // Arrivée depuis une notification, le top des campagnes ou l'onglet Partenaires
    // (?statut / ?pub / ?partenaire) : onglet Campagnes.
    this.route.queryParamMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      if (params.has('statut') || params.has('pub') || params.has('partenaire')) {
        this.ongletActif.set('campagnes');
      }
    });
  }

  changerOnglet(onglet: OngletPublicitesAdmin): void {
    this.ongletActif.set(onglet);
  }
}

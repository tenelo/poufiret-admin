import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { PublicitesAdmin } from '../publicites-admin';
import { FormulesParametresPub } from '../formules-parametres-pub/formules-parametres-pub';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';

type OngletPublicitesAdmin = 'campagnes' | 'formules';

/**
 * Page admin "Publicités" : onglet « Campagnes » (l'écran historique, inchangé) et onglet
 * « Formules & paramètres », visible seulement pour un super-admin ou une capacité
 * gerer_formules_pub. Sans ce droit, la page s'affiche comme avant, sans barre d'onglets.
 */
@Component({
  selector: 'app-publicites-admin-onglets',
  imports: [PublicitesAdmin, FormulesParametresPub],
  templateUrl: './publicites-admin-onglets.html',
  styleUrl: './publicites-admin-onglets.scss',
})
export class PublicitesAdminOnglets {
  private readonly permissionsService = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);

  readonly ongletActif = signal<OngletPublicitesAdmin>('campagnes');

  readonly peutGererFormules = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('gerer_formules_pub'),
  );

  constructor() {
    // Arrivée depuis une notification (?statut / ?pub) : toujours sur l'onglet Campagnes.
    this.route.queryParamMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      if (params.has('statut') || params.has('pub')) {
        this.ongletActif.set('campagnes');
      }
    });
  }

  changerOnglet(onglet: OngletPublicitesAdmin): void {
    this.ongletActif.set(onglet);
  }
}

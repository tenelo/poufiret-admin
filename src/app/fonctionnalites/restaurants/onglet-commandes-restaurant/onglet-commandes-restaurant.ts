import { Component, computed, inject, input } from '@angular/core';

import { CommandesAdmin } from '../../administration/commandes-admin/commandes-admin';
import { MesCommandes } from '../../partenaire/mes-commandes/mes-commandes';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';

/**
 * Onglet Commandes de l'espace restaurant : réutilise les composants existants, sans copie.
 * - Côté admin (préfixe admin/<id>) : le centre des commandes admin (CommandesAdmin,
 *   /orders/admin/...), filtré et verrouillé sur ce restaurant — réservé à un admin qui a la
 *   capacité gerer_commandes (ou au super-admin) : les endpoints admin/... la requièrent, un admin
 *   sans ce droit y recevrait une 403. "Mes commandes" (endpoints partenaire) n'est jamais utilisé
 *   ici : un compte admin n'y est pas autorisé.
 * - Côté restaurateur (préfixe mon-restaurant) : l'écran "Mes commandes" déjà existant, propre à
 *   l'espace partenaire — "Mes commandes" ne liste de toute façon que les commandes de ce
 *   restaurant, le filtrage y est donc déjà implicite.
 */
@Component({
  selector: 'app-onglet-commandes-restaurant',
  imports: [CommandesAdmin, MesCommandes],
  templateUrl: './onglet-commandes-restaurant.html',
  styleUrl: './onglet-commandes-restaurant.scss',
})
export class OngletCommandesRestaurant {
  private readonly permissionsService = inject(PermissionsService);

  readonly estAdmin = input(false);
  readonly partenaireId = input<number | null>(null);
  readonly nomRestaurant = input<string | null>(null);

  readonly peutGererCommandes = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('gerer_commandes'),
  );

  readonly partenaireFixe = computed(() => {
    const id = this.partenaireId();
    return id !== null ? { id, nom: this.nomRestaurant() ?? 'ce restaurant' } : null;
  });
}

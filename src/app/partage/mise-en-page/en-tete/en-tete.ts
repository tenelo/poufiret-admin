import { Component, computed, inject, input, output } from '@angular/core';

import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { ClocheNotifications } from '../cloche-notifications/cloche-notifications';

/**
 * En-tête de la coquille applicative : affiche l'utilisateur connecté
 * et permet de se déconnecter. Espace partenaire uniquement : cloche de
 * notification des nouvelles commandes (voir ClocheNotifications).
 * Sur mobile/tablette (< 992px), porte le bouton hamburger qui ouvre/ferme
 * le tiroir de navigation géré par la coquille.
 */
@Component({
  selector: 'app-en-tete',
  imports: [ClocheNotifications],
  templateUrl: './en-tete.html',
  styleUrl: './en-tete.scss',
})
export class EnTete {
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);

  /** État du tiroir, pour aria-expanded du bouton hamburger. */
  readonly menuOuvert = input(false);
  readonly menuBascule = output<void>();

  readonly utilisateur = this.authService.utilisateur;

  /** Nom complet (prénom + nom) si renseigné, sinon le téléphone. */
  readonly nomAffiche = computed(() => {
    const u = this.utilisateur();
    if (!u) {
      return '';
    }
    const nomComplet = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return nomComplet || u.telephone;
  });

  readonly estPartenaire = computed(() => this.authService.role() === 'partenaire');

  /** True pour un admin dont is_superuser=true (permissions déjà chargées par CoquilleApplication). */
  readonly estSuperadmin = computed(
    () => this.permissionsService.permissionsActuelles()?.isSuperuser ?? false,
  );

  /** "Super-admin" prime sur le rôle brut ; sinon rôle capitalisé (Admin / Partenaire / Client). */
  readonly libelleRole = computed(() => {
    if (this.estSuperadmin()) {
      return 'Super-admin';
    }
    const role = this.authService.role();
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  });

  deconnexion(): void {
    this.authService.deconnexion();
  }
}

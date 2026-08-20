import { Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';

/**
 * En-tête de la coquille applicative : affiche l'utilisateur connecté
 * et permet de se déconnecter.
 */
@Component({
  selector: 'app-en-tete',
  imports: [],
  templateUrl: './en-tete.html',
  styleUrl: './en-tete.scss',
})
export class EnTete {
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);

  readonly utilisateur = this.authService.utilisateur;

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

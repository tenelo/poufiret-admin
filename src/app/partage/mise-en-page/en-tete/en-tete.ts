import { Component, inject } from '@angular/core';

import { AuthService } from '../../../noyau/auth/auth.service';

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

  readonly utilisateur = this.authService.utilisateur;
  readonly role = this.authService.role;

  deconnexion(): void {
    this.authService.deconnexion();
  }
}

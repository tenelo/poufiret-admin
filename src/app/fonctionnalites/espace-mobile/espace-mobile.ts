import { Component, inject } from '@angular/core';

import { AuthService } from '../../noyau/auth/auth.service';

/**
 * Page affichée aux utilisateurs dont l'espace (client, livreur) n'a pas
 * d'accès web — seule l'application mobile Poufiret leur est destinée.
 */
@Component({
  selector: 'app-espace-mobile',
  imports: [],
  templateUrl: './espace-mobile.html',
  styleUrl: './espace-mobile.scss',
})
export class EspaceMobile {
  private readonly authService = inject(AuthService);

  deconnexion(): void {
    this.authService.deconnexion();
  }
}

import { Component, inject } from '@angular/core';

import { AuthService } from '../../noyau/auth/auth.service';

/**
 * Page d'accueil après connexion. Le contenu réel (statistiques, etc.)
 * sera ajouté module par module.
 */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.scss',
})
export class TableauDeBord {
  private readonly authService = inject(AuthService);

  readonly utilisateur = this.authService.utilisateur;
}

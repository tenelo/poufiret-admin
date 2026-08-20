import { Component, inject } from '@angular/core';

import { AuthService } from '../../noyau/auth/auth.service';
import { TableauDeBordPartenaire } from '../partenaire/tableau-de-bord-partenaire/tableau-de-bord-partenaire';
import { TableauDeBordAdmin } from '../administration/tableau-de-bord-admin/tableau-de-bord-admin';

/**
 * Page d'accueil après connexion. Délègue au tableau de bord riche
 * correspondant au rôle : partenaire (statistiques agrégées) ou admin
 * (activité comptes/connexions/appareils).
 */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [TableauDeBordPartenaire, TableauDeBordAdmin],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.scss',
})
export class TableauDeBord {
  private readonly authService = inject(AuthService);

  readonly utilisateur = this.authService.utilisateur;
  readonly role = this.authService.role;
}

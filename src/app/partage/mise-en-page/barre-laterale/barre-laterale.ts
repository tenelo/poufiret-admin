import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';

interface EntreeMenu {
  libelle: string;
  lien?: string;
}

// Entrées de menu placeholder : les écrans métier seront ajoutés module par module.
const ENTREES_ADMIN: EntreeMenu[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Partenaires' },
  { libelle: 'Utilisateurs' },
  { libelle: 'Commandes' },
  { libelle: 'Catégories' },
];

const ENTREES_PARTENAIRE: EntreeMenu[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil' },
  { libelle: 'Mes commandes' },
  { libelle: 'Mes produits' },
];

/**
 * Menu latéral de la coquille applicative. Les entrées affichées dépendent
 * du rôle de l'utilisateur connecté (admin vs partenaire).
 */
@Component({
  selector: 'app-barre-laterale',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barre-laterale.html',
  styleUrl: './barre-laterale.scss',
})
export class BarreLaterale {
  private readonly authService = inject(AuthService);

  readonly entrees = computed<EntreeMenu[]>(() => {
    return this.authService.role() === 'admin' ? ENTREES_ADMIN : ENTREES_PARTENAIRE;
  });
}

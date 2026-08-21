import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../noyau/auth/auth.service';
import { NiveauLivraison, niveauDepuisEspace } from '../../niveau-livraison';

interface EntreeMenuLivraison {
  libelle: string;
  lien: string;
  icone: string;
}

// Entrées par niveau — pour A1, toutes pointent vers des placeholders "à venir".
// Ajouter les écrans métier reviendra à remplacer le composant de la route,
// sans toucher à cette structure de menu.
const ENTREES_PAR_NIVEAU: Record<NiveauLivraison, EntreeMenuLivraison[]> = {
  coordonnateur: [
    { libelle: "Vue d'ensemble", lien: '/livraison/coordonnateur', icone: '📊' },
    { libelle: 'Toutes les villes', lien: '/livraison/coordonnateur/villes', icone: '🏙️' },
    { libelle: 'Comptes livraison', lien: '/livraison/coordonnateur/comptes', icone: '👥' },
  ],
  superviseur: [
    { libelle: 'Ma ville', lien: '/livraison/superviseur', icone: '🏙️' },
    { libelle: 'Carte', lien: '/livraison/superviseur/carte', icone: '🗺️' },
    { libelle: 'Comptes de ma ville', lien: '/livraison/superviseur/comptes', icone: '👥' },
  ],
  gestionnaire: [
    { libelle: 'Courses', lien: '/livraison/gestionnaire', icone: '📦' },
    { libelle: 'Carte', lien: '/livraison/gestionnaire/carte', icone: '🗺️' },
    { libelle: 'Livreurs', lien: '/livraison/gestionnaire/livreurs', icone: '🛵' },
  ],
};

/**
 * Menu latéral de l'espace TeneLivr — propre au module livraison (ne
 * réutilise pas la barre latérale admin). Les entrées affichées dépendent du
 * niveau hiérarchique (dérivé de `espace`), pas des capacités admin Poufiret.
 */
@Component({
  selector: 'app-barre-laterale-livraison',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barre-laterale-livraison.html',
  styleUrl: './barre-laterale-livraison.scss',
})
export class BarreLateraleLivraison {
  private readonly authService = inject(AuthService);

  readonly entrees = computed<EntreeMenuLivraison[]>(() => {
    const niveau = niveauDepuisEspace(this.authService.utilisateur()?.espace);
    return niveau ? ENTREES_PAR_NIVEAU[niveau] : [];
  });
}

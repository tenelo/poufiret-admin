import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../noyau/auth/auth.service';
import { routeParEspace } from '../../noyau/auth/route-par-espace';
import { niveauDepuisEspace } from './niveau-livraison';

/**
 * Garde d'accès à l'espace TeneLivr : autorise uniquement les trois espaces
 * de livraison (coordination_livraison, supervision_livraison,
 * gestion_livraison), via le champ `espace` de l'utilisateur courant —
 * jamais via les permissions/capacités admin Poufiret (isolation du module).
 */
export const livraisonGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const espace = authService.utilisateur()?.espace;
  if (niveauDepuisEspace(espace)) {
    return true;
  }
  return router.createUrlTree([routeParEspace(espace)]);
};

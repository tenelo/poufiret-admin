import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { routeParEspace } from './route-par-espace';

/**
 * Garde posée sur la coquille admin/partenaire (path '') : écarte les
 * utilisateurs dont l'espace n'est ni admin/super_admin ni partenaire
 * (TeneLivr, client/livreur) vers leur propre espace, avant qu'ils
 * n'atteignent le menu/layout admin-partenaire.
 *
 * Si `espace` est absent (session mise en cache avant l'ajout de ce champ
 * backend), on laisse passer sans y toucher — comportement historique
 * inchangé, aucune régression pour les sessions admin/partenaire existantes.
 */
export const redirectionRacineGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const espace = authService.utilisateur()?.espace;
  if (!espace || espace === 'admin' || espace === 'super_admin' || espace === 'partenaire') {
    return true;
  }
  return router.createUrlTree([routeParEspace(espace)]);
};

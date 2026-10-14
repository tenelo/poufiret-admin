import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ENTREES_ADMIN } from '../permissions/entrees-admin';

/**
 * Posée sur /tableau-de-bord : un admin sans la capacité voir_stats y atterrissait quand même
 * (route par défaut après connexion), pour n'y voir qu'une erreur de permission vide. Redirige
 * plutôt vers sa première entrée de menu accessible (même ordre que la barre latérale, voir
 * ENTREES_ADMIN) — « Accès refusé » en dernier recours si l'admin n'a vraiment aucune capacité.
 * Partenaires et super-admins (qui ont toujours voir_stats) ne sont pas concernés.
 */
export const tableauDeBordAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  if (authService.role() !== 'admin') {
    return true;
  }

  return permissionsService.chargerPermissions().pipe(
    map((permissions) => {
      if (permissions.capacites['voir_stats']) {
        return true;
      }

      const premiereEntree = ENTREES_ADMIN.find((entree) => {
        if (entree.lien === '/tableau-de-bord' || entree.toujoursVisible) {
          return false;
        }
        if (entree.capacite) {
          const capacites = Array.isArray(entree.capacite) ? entree.capacite : [entree.capacite];
          return capacites.some((c) => permissions.capacites[c]);
        }
        return permissions.isSuperuser;
      });

      return router.createUrlTree([premiereEntree?.lien ?? '/acces-refuse']);
    }),
  );
};

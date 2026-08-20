import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { PermissionsService } from './permissions.service';

/**
 * Protège une route admin selon une capacité déclarée dans ses `data`
 * (ex. `data: { capacite: 'voir_stats' }`). Charge les permissions si besoin
 * (une seule requête, mise en cache par PermissionsService), puis autorise
 * si l'admin a la capacité requise (un superuser les a toutes, déjà reflété
 * par le backend). Sinon, redirige vers l'écran "Accès refusé".
 *
 * Une route sans `data.capacite` est laissée ouverte (rien à vérifier ici).
 */
export const capaciteGuard: CanActivateFn = (route) => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  const capaciteRequise = route.data['capacite'] as string | undefined;
  if (!capaciteRequise) {
    return true;
  }

  return permissionsService.chargerPermissions().pipe(
    map((permissions) => {
      if (permissions.capacites[capaciteRequise]) {
        return true;
      }
      return router.createUrlTree(['/acces-refuse']);
    }),
  );
};

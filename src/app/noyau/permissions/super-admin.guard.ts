import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { PermissionsService } from './permissions.service';

/**
 * Protège les routes admin les plus sensibles (ex. modération de comptes),
 * réservées au super-admin (`is_superuser`) — indépendamment des capacités
 * fines vérifiées par capaciteGuard. Charge les permissions si besoin (cache
 * partagé avec capaciteGuard), redirige vers "Accès refusé" sinon.
 */
export const superAdminGuard: CanActivateFn = () => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  return permissionsService.chargerPermissions().pipe(
    map((permissions) => {
      if (permissions.isSuperuser) {
        return true;
      }
      return router.createUrlTree(['/acces-refuse']);
    }),
  );
};

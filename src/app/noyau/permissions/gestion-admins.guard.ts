import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { PermissionsService } from './permissions.service';

/**
 * Protège l'écran "Gestion des admins" : accessible si super-admin OU si
 * l'admin connecté a la capacité `gerer_admins` (condition combinée,
 * distincte de superAdminGuard et de capaciteGuard qui ne testent chacun
 * qu'une seule des deux conditions).
 */
export const gestionAdminsGuard: CanActivateFn = () => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  return permissionsService.chargerPermissions().pipe(
    map((permissions) => {
      if (permissions.isSuperuser || permissions.capacites['gerer_admins']) {
        return true;
      }
      return router.createUrlTree(['/acces-refuse']);
    }),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { RoleUtilisateur } from '../../modeles/utilisateur.model';

/**
 * Fabrique une garde qui n'autorise l'accès qu'aux utilisateurs connectés
 * dont le rôle figure dans `rolesAutorises`. Suppose que authGuard a déjà
 * vérifié que l'utilisateur est connecté (à combiner dans la config de routes).
 */
export function roleGuard(rolesAutorises: RoleUtilisateur[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.role();
    if (role && rolesAutorises.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/connexion']);
  };
}

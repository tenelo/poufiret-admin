import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Protège les routes nécessitant une authentification.
 * Redirige vers /connexion si aucun utilisateur n'est connecté.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estConnecte()) {
    return true;
  }

  return router.createUrlTree(['/connexion']);
};

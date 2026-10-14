import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Fabrique un guard qui redirige vers le menu "Paramètres" unique
 * (administration/parametres) avec l'onglet correspondant, pour les
 * anciennes routes séparées (gestion-admins, géographie, modération)
 * désormais fusionnées en onglets (voir Parametres).
 */
export function redirectionOngletParametres(onglet: string): CanActivateFn {
  return () => {
    const router = inject(Router);
    void router.navigate(['/administration/parametres'], { queryParams: { onglet } });
    return false;
  };
}

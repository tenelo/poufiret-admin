import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Fabrique un guard qui redirige vers le menu "Partenaires" unique
 * (administration/partenaires-liste) avec l'onglet correspondant, pour les
 * anciennes routes séparées (créer-partenaire, demandes-partenariat,
 * indicateurs-partenaires) désormais fusionnées en onglets (voir PartenairesOnglets).
 */
export function redirectionOngletPartenaires(onglet: string): CanActivateFn {
  return () => {
    const router = inject(Router);
    void router.navigate(['/administration/partenaires-liste'], { queryParams: { onglet } });
    return false;
  };
}

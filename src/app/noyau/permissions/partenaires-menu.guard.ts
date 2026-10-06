import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { PermissionsService } from './permissions.service';

// Une seule de ces capacités suffit à accéder au menu "Partenaires" (chaque onglet
// affiché n'est ensuite déterminé que par son propre droit — voir PartenairesOnglets).
const CAPACITES_MENU_PARTENAIRES = ['voir_indicateurs', 'creer_partenaire', 'valider_devenir_partenaire'];

/**
 * Protège le menu "Partenaires" unique (onglets Liste/Statistiques/Nouveau
 * partenaire/Demandes de partenariat/Indicateurs) : accessible si super-admin OU si
 * l'admin a AU MOINS UNE des capacités requises par l'un de ces onglets — condition
 * combinée en OU, distincte de capaciteGuard qui ne teste qu'une seule capacité.
 */
export const partenairesMenuGuard: CanActivateFn = () => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  return permissionsService.chargerPermissions().pipe(
    map((permissions) => {
      if (permissions.isSuperuser || CAPACITES_MENU_PARTENAIRES.some((c) => permissions.capacites[c])) {
        return true;
      }
      return router.createUrlTree(['/acces-refuse']);
    }),
  );
};

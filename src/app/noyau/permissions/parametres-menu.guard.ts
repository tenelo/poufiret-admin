import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { PermissionsService } from './permissions.service';

// Une seule de ces capacités suffit à accéder au menu "Paramètres" unique (chaque onglet affiché
// n'est ensuite déterminé que par son propre droit — voir Parametres). L'onglet "Modération de
// comptes" n'a pas de capacité fine (réservé au super-admin) : déjà couvert par isSuperuser.
const CAPACITES_MENU_PARAMETRES = ['gerer_parametres', 'gerer_admins', 'gerer_geographie'];

/**
 * Protège le menu "Paramètres" unique (onglets Gestion des admins/Géographie/Recherche/Modération
 * de comptes) : accessible si super-admin OU si l'admin a AU MOINS UNE des capacités requises par
 * l'un de ces onglets — même principe que partenairesMenuGuard.
 */
export const parametresMenuGuard: CanActivateFn = () => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  return permissionsService.chargerPermissions().pipe(
    map((permissions) => {
      if (permissions.isSuperuser || CAPACITES_MENU_PARAMETRES.some((c) => permissions.capacites[c])) {
        return true;
      }
      return router.createUrlTree(['/acces-refuse']);
    }),
  );
};

import { Routes } from '@angular/router';

import { authGuard } from './noyau/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () =>
      import('./fonctionnalites/authentification/connexion/connexion').then((m) => m.Connexion),
  },
  {
    // Coquille applicative : toutes les routes protégées (nécessitant une connexion) vivent ici.
    // Pour restreindre une route future à un rôle précis, ajouter roleGuard(['admin']) (ou ['partenaire'])
    // dans son propre `canActivate`, en plus de l'authGuard déjà posé sur ce parent.
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./partage/mise-en-page/coquille-application/coquille-application').then(
        (m) => m.CoquilleApplication,
      ),
    children: [
      {
        path: 'tableau-de-bord',
        loadComponent: () =>
          import('./fonctionnalites/tableau-de-bord/tableau-de-bord').then((m) => m.TableauDeBord),
      },
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
    ],
  },
  { path: '**', redirectTo: 'connexion' },
];

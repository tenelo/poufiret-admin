import { Routes } from '@angular/router';

import { authGuard } from './noyau/auth/auth.guard';
import { roleGuard } from './noyau/auth/role.guard';
import { capaciteGuard } from './noyau/permissions/capacite.guard';

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
      {
        path: 'mon-profil',
        canActivate: [roleGuard(['partenaire'])],
        loadComponent: () =>
          import('./fonctionnalites/partenaire/mon-profil/mon-profil').then((m) => m.MonProfil),
      },
      {
        path: 'mes-categories',
        canActivate: [roleGuard(['partenaire'])],
        loadComponent: () =>
          import('./fonctionnalites/partenaire/mes-categories/mes-categories').then(
            (m) => m.MesCategories,
          ),
      },
      {
        path: 'mes-produits',
        canActivate: [roleGuard(['partenaire'])],
        loadComponent: () =>
          import('./fonctionnalites/partenaire/mes-produits/mes-produits').then(
            (m) => m.MesProduits,
          ),
      },
      {
        path: 'mes-commandes',
        canActivate: [roleGuard(['partenaire'])],
        loadComponent: () =>
          import('./fonctionnalites/partenaire/mes-commandes/mes-commandes').then(
            (m) => m.MesCommandes,
          ),
      },
      {
        path: 'publicites',
        canActivate: [roleGuard(['partenaire'])],
        loadComponent: () =>
          import('./fonctionnalites/partenaire/publicites/publicites').then((m) => m.Publicites),
      },
      {
        path: 'acces-refuse',
        loadComponent: () =>
          import('./fonctionnalites/administration/acces-refuse/acces-refuse').then(
            (m) => m.AccesRefuse,
          ),
      },
      // Écrans admin : chaque route déclare la capacité qui la protège (data.capacite,
      // vérifiée par capaciteGuard).
      {
        path: 'administration/indicateurs-partenaires',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'voir_indicateurs' },
        loadComponent: () =>
          import('./fonctionnalites/administration/indicateurs-partenaires/indicateurs-partenaires').then(
            (m) => m.IndicateursPartenairesComponent,
          ),
      },
      {
        path: 'administration/demandes-partenariat',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'valider_devenir_partenaire' },
        loadComponent: () =>
          import('./fonctionnalites/administration/demandes-partenariat/demandes-partenariat').then(
            (m) => m.DemandesPartenariat,
          ),
      },
      {
        path: 'administration/journal',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'lire_journal' },
        loadComponent: () =>
          import('./fonctionnalites/administration/journal-audit/journal-audit').then(
            (m) => m.JournalAudit,
          ),
      },
      {
        path: 'administration/engagement-clients',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'voir_stats' },
        loadComponent: () =>
          import('./fonctionnalites/administration/engagement-clients/engagement-clients').then(
            (m) => m.EngagementClientsComponent,
          ),
      },
      {
        path: 'administration/stats-connexion',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'voir_stats' },
        loadComponent: () =>
          import('./fonctionnalites/administration/stats-connexion/stats-connexion').then(
            (m) => m.StatsConnexionComponent,
          ),
      },
      {
        path: 'administration/publicites',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'voir_stats' },
        loadComponent: () =>
          import('./fonctionnalites/administration/publicites-admin/publicites-admin').then(
            (m) => m.PublicitesAdmin,
          ),
      },
      {
        path: 'administration/credits-pub',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'offrir_campagne' },
        loadComponent: () =>
          import('./fonctionnalites/administration/credits-pub/credits-pub').then((m) => m.CreditsPub),
      },
      {
        path: 'administration/faveur-plan',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'accorder_faveur' },
        loadComponent: () =>
          import('./fonctionnalites/administration/faveur-plan/faveur-plan').then((m) => m.FaveurPlan),
      },
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
    ],
  },
  { path: '**', redirectTo: 'connexion' },
];

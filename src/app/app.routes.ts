import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { authGuard } from './noyau/auth/auth.guard';
import { roleGuard } from './noyau/auth/role.guard';
import { capaciteGuard } from './noyau/permissions/capacite.guard';
import { superAdminGuard } from './noyau/permissions/super-admin.guard';
import { gestionAdminsGuard } from './noyau/permissions/gestion-admins.guard';
import { redirectionRacineGuard } from './noyau/auth/redirection-racine.guard';
import { AuthService } from './noyau/auth/auth.service';
import { livraisonGuard } from './fonctionnalites/livraison/livraison.guard';
import { niveauDepuisEspace, racineNiveau } from './fonctionnalites/livraison/niveau-livraison';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () =>
      import('./fonctionnalites/authentification/connexion/connexion').then((m) => m.Connexion),
  },
  {
    // Coquille applicative (espaces admin/partenaire) : toutes les routes protégées
    // (nécessitant une connexion) vivent ici. Pour restreindre une route future à un
    // rôle précis, ajouter roleGuard(['admin']) (ou ['partenaire']) dans son propre
    // `canActivate`, en plus de l'authGuard déjà posé sur ce parent.
    // redirectionRacineGuard écarte les espaces TeneLivr/mobile-only vers leur propre
    // espace avant d'entrer ici (voir noyau/auth/route-par-espace.ts).
    path: '',
    canActivate: [authGuard, redirectionRacineGuard],
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
      {
        path: 'administration/creer-partenaire',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: { capacite: 'creer_partenaire' },
        loadComponent: () =>
          import('./fonctionnalites/administration/creation-partenaire/creation-partenaire').then(
            (m) => m.CreationPartenaire,
          ),
      },
      {
        // Réservé super-admin : is_superuser, pas une capacité fine.
        path: 'administration/moderation',
        canActivate: [roleGuard(['admin']), superAdminGuard],
        loadComponent: () =>
          import('./fonctionnalites/administration/moderation/moderation').then((m) => m.Moderation),
      },
      {
        path: 'administration/paiements',
        canActivate: [roleGuard(['admin']), capaciteGuard],
        data: {
          capacite: 'voir_stats',
          titre: 'Paiements',
          message: 'Module de paiement — bientôt disponible.',
        },
        loadComponent: () =>
          import('./fonctionnalites/administration/ecran-a-venir/ecran-a-venir').then((m) => m.EcranAVenir),
      },
      {
        // Accès combiné : super-admin OU capacité gerer_admins (voir gestionAdminsGuard).
        path: 'administration/gestion-admins',
        canActivate: [roleGuard(['admin']), gestionAdminsGuard],
        loadComponent: () =>
          import('./fonctionnalites/administration/gestion-admins/gestion-admins').then(
            (m) => m.GestionAdmins,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
    ],
  },
  {
    path: 'espace-mobile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./fonctionnalites/espace-mobile/espace-mobile').then((m) => m.EspaceMobile),
  },
  {
    // Espace TeneLivr, isolé du reste de l'app (voir fonctionnalites/livraison/).
    // livraisonGuard n'autorise que les espaces coordination/supervision/gestion_livraison.
    path: 'livraison',
    canActivate: [authGuard, livraisonGuard],
    loadComponent: () =>
      import('./fonctionnalites/livraison/mise-en-page/layout-livraison/layout-livraison').then(
        (m) => m.LayoutLivraison,
      ),
    children: [
      {
        path: 'coordonnateur',
        children: [
          {
            path: '',
            pathMatch: 'full',
            data: { titre: "Vue d'ensemble" },
            loadComponent: () =>
              import('./fonctionnalites/livraison/ecran-a-venir-livraison/ecran-a-venir-livraison').then(
                (m) => m.EcranAVenirLivraison,
              ),
          },
          {
            path: 'villes',
            data: { titre: 'Toutes les villes' },
            loadComponent: () =>
              import('./fonctionnalites/livraison/ecran-a-venir-livraison/ecran-a-venir-livraison').then(
                (m) => m.EcranAVenirLivraison,
              ),
          },
          {
            path: 'comptes',
            data: { titre: 'Comptes livraison' },
            loadComponent: () =>
              import('./fonctionnalites/livraison/ecran-a-venir-livraison/ecran-a-venir-livraison').then(
                (m) => m.EcranAVenirLivraison,
              ),
          },
        ],
      },
      {
        path: 'superviseur',
        children: [
          {
            path: '',
            pathMatch: 'full',
            data: { titre: 'Ma ville' },
            loadComponent: () =>
              import('./fonctionnalites/livraison/ecran-a-venir-livraison/ecran-a-venir-livraison').then(
                (m) => m.EcranAVenirLivraison,
              ),
          },
          {
            path: 'comptes',
            data: { titre: 'Comptes de ma ville' },
            loadComponent: () =>
              import('./fonctionnalites/livraison/ecran-a-venir-livraison/ecran-a-venir-livraison').then(
                (m) => m.EcranAVenirLivraison,
              ),
          },
          {
            path: 'carte',
            loadComponent: () =>
              import('./fonctionnalites/livraison/carte-livreurs/carte-livreurs').then(
                (m) => m.CarteLivreurs,
              ),
          },
        ],
      },
      {
        path: 'gestionnaire',
        children: [
          {
            // Poste de dispatching : courses + livreurs de la ville, assignation manuelle.
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import(
                './fonctionnalites/livraison/bureau/dispatching-gestionnaire/dispatching-gestionnaire'
              ).then((m) => m.DispatchingGestionnaire),
          },
          {
            path: 'livreurs',
            data: { titre: 'Livreurs' },
            loadComponent: () =>
              import('./fonctionnalites/livraison/ecran-a-venir-livraison/ecran-a-venir-livraison').then(
                (m) => m.EcranAVenirLivraison,
              ),
          },
          {
            path: 'carte',
            loadComponent: () =>
              import('./fonctionnalites/livraison/carte-livreurs/carte-livreurs').then(
                (m) => m.CarteLivreurs,
              ),
          },
        ],
      },
      {
        // Redirige /livraison vers la racine du niveau de l'utilisateur connecté
        // (livraisonGuard garantit qu'un niveau existe à ce stade).
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const authService = inject(AuthService);
          const niveau = niveauDepuisEspace(authService.utilisateur()?.espace);
          return niveau ? racineNiveau(niveau) : '/connexion';
        },
      },
    ],
  },
  { path: '**', redirectTo: 'connexion' },
];

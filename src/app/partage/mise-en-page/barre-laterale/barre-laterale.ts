import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';
import { NomCapacite } from '../../../modeles/permissions-admin.model';

interface EntreeMenuPartenaire {
  libelle: string;
  lien?: string;
}

// Entrées de menu admin : chacune déclare la capacité qui la débloque.
// Pour ajouter un écran admin, il suffit d'ajouter une ligne ici (+ sa route
// protégée par capaciteGuard) — aucune autre modification n'est nécessaire.
// Une entrée sans `capacite` (ex. Modération de comptes) est réservée au
// super-admin (is_superuser), à la place d'une capacité fine.
interface EntreeMenuAdmin {
  libelle: string;
  lien: string;
  icone: string;
  // Un tableau teste en OU (visible si au moins une des capacités est présente) —
  // ex. le menu "Partenaires" unique, dont les onglets ont chacun leur propre droit.
  capacite?: NomCapacite | NomCapacite[];
  // Sans `capacite` : visible pour tout admin connecté (ex. Mon profil), à la
  // différence d'une entrée sans `capacite` ET sans ce flag, réservée au
  // super-admin (ex. Modération de comptes).
  toujoursVisible?: boolean;
}

// Commun à tous les partenaires. Pour un restaurateur, "Ma carte"/"Mes menus" remplacent
// "Mes catégories"/"Mes produits" (voir ENTREES_PARTENAIRE_RESTAURATEUR) — même donnée, interface
// restaurant dédiée (espace restaurant, voir fonctionnalites/restaurants/).
const ENTREES_PARTENAIRE_STANDARD: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mes catégories', lien: '/mes-categories' },
  { libelle: 'Mes produits', lien: '/mes-produits' },
  { libelle: 'Mes commandes', lien: '/mes-commandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_PARTENAIRE_RESTAURATEUR: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mon restaurant', lien: '/mon-restaurant' },
  { libelle: 'Ma carte', lien: '/ma-carte' },
  { libelle: 'Mes menus', lien: '/mes-menus' },
  { libelle: 'Mes commandes', lien: '/mes-commandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_PARTENAIRE_LOUEUR: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mes logements', lien: '/mes-logements' },
  { libelle: 'Mes demandes', lien: '/mes-demandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_ADMIN: EntreeMenuAdmin[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord', icone: '📊', capacite: 'voir_stats' },
  {
    libelle: 'Mon profil',
    lien: '/administration/mon-profil',
    icone: '👤',
    toujoursVisible: true,
  },
  {
    // Menu unique à onglets (Liste/Statistiques/Nouveau partenaire/Demandes de
    // partenariat/Indicateurs) : visible si au moins un de ces droits est présent,
    // chaque onglet restant individuellement masqué sans son propre droit.
    libelle: 'Partenaires',
    lien: '/administration/partenaires-liste',
    icone: '🏪',
    capacite: ['voir_indicateurs', 'creer_partenaire', 'valider_devenir_partenaire'],
  },
  {
    libelle: "Journal d'audit",
    lien: '/administration/journal',
    icone: '📜',
    capacite: 'lire_journal',
  },
  {
    libelle: 'Connexions admin',
    lien: '/administration/connexions-admin',
    icone: '🔐',
    capacite: 'lire_journal',
  },
  {
    libelle: "Demandes d'intervention",
    lien: '/administration/interventions',
    icone: '🛠️',
    capacite: 'voir_interventions',
  },
  {
    libelle: 'Engagement clients',
    lien: '/administration/engagement-clients',
    icone: '🧑‍🤝‍🧑',
    capacite: 'voir_stats',
  },
  {
    libelle: 'Stats de connexion',
    lien: '/administration/stats-connexion',
    icone: '🔌',
    capacite: 'voir_stats',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_commandes.
    libelle: 'Commandes',
    lien: '/administration/commandes',
    icone: '🧾',
    capacite: 'gerer_commandes',
  },
  {
    libelle: 'Publicités',
    lien: '/administration/publicites',
    icone: '📣',
    capacite: 'voir_stats',
  },
  {
    libelle: 'Crédits de pub',
    lien: '/administration/credits-pub',
    icone: '🎁',
    capacite: 'offrir_campagne',
  },
  {
    libelle: 'Faveur de plan',
    lien: '/administration/faveur-plan',
    icone: '⭐',
    capacite: 'accorder_faveur',
  },
  {
    libelle: 'Paiements',
    lien: '/administration/paiements',
    icone: '💳',
    capacite: 'voir_stats',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_geographie.
    libelle: 'Géographie',
    lien: '/administration/geographie',
    icone: '🗺️',
    capacite: 'gerer_geographie',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_restaurants.
    libelle: 'Restaurants',
    lien: '/administration/restaurants',
    icone: '🍽️',
    capacite: 'gerer_restaurants',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_locations.
    libelle: 'Locations',
    lien: '/administration/locations',
    icone: '🏠',
    capacite: 'gerer_locations',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_reservations.
    libelle: 'Demandes de location',
    lien: '/administration/demandes-location',
    icone: '📅',
    capacite: 'gerer_reservations',
  },
  {
    // Pas de capacité : réservé au super-admin, voir le filtre ci-dessous.
    libelle: 'Modération de comptes',
    lien: '/administration/moderation',
    icone: '🛡️',
  },
  {
    // is_superuser a toujours cette capacité à true côté backend : suffit à
    // couvrir la condition "super-admin OU gerer_admins" pour le menu.
    libelle: 'Gestion des admins',
    lien: '/administration/gestion-admins',
    icone: '👥',
    capacite: 'gerer_admins',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_parametres.
    libelle: 'Catégories',
    lien: '/administration/categories',
    icone: '🗂️',
    capacite: 'gerer_parametres',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_parametres.
    // En bas du menu : accueillera d'autres réglages transverses à l'avenir.
    libelle: 'Paramètres',
    lien: '/administration/parametres',
    icone: '⚙️',
    capacite: 'gerer_parametres',
  },
];

/**
 * Menu latéral de la coquille applicative. Les entrées affichées dépendent du
 * rôle de l'utilisateur connecté (admin vs partenaire) ; côté admin, chaque
 * entrée n'apparaît que si l'admin connecté a la capacité qu'elle requiert
 * (chargée par PermissionsService, mis en cache — voir CoquilleApplication
 * pour le déclenchement du chargement).
 */
@Component({
  selector: 'app-barre-laterale',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barre-laterale.html',
  styleUrl: './barre-laterale.scss',
})
export class BarreLaterale {
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly profilPartenaireContexte = inject(ProfilPartenaireContexteService);

  readonly estAdmin = computed(() => this.authService.role() === 'admin');

  readonly entreesPartenaire = computed<EntreeMenuPartenaire[]>(() => {
    if (this.profilPartenaireContexte.estRestaurateur()) return ENTREES_PARTENAIRE_RESTAURATEUR;
    if (this.profilPartenaireContexte.estLoueur()) return ENTREES_PARTENAIRE_LOUEUR;
    return ENTREES_PARTENAIRE_STANDARD;
  });

  readonly entreesAdmin = computed<EntreeMenuAdmin[]>(() =>
    ENTREES_ADMIN.filter((entree) => {
      if (entree.capacite) {
        const capacites = Array.isArray(entree.capacite) ? entree.capacite : [entree.capacite];
        return capacites.some((c) => this.permissionsService.aLaCapacite(c));
      }
      if (entree.toujoursVisible) {
        return true;
      }
      return this.permissionsService.permissionsActuelles()?.isSuperuser ?? false;
    }),
  );
}

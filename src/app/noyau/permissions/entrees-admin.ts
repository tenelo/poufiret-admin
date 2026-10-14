import { NomCapacite } from '../../modeles/permissions-admin.model';

// Entrées de menu admin : chacune déclare la capacité qui la débloque.
// Pour ajouter un écran admin, il suffit d'ajouter une ligne ici (+ sa route
// protégée par capaciteGuard) — aucune autre modification n'est nécessaire.
// Une entrée sans `capacite` (ex. Modération de comptes) est réservée au
// super-admin (is_superuser), à la place d'une capacité fine.
// Source commune à la barre latérale (affichage) et à tableauDeBordAdminGuard
// (première destination quand l'admin n'a pas voir_stats) — même ordre, un
// seul endroit à modifier.
export interface EntreeMenuAdmin {
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

export const ENTREES_ADMIN: EntreeMenuAdmin[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord', icone: '📊', capacite: 'voir_stats' },
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
    capacite: ['voir_interventions', 'gerer_interventions'],
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
    // En bas du menu, juste avant Paramètres : visible pour tout admin connecté.
    libelle: 'Mon profil',
    lien: '/administration/mon-profil',
    icone: '👤',
    toujoursVisible: true,
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_parametres.
    // Tout en bas du menu : accueillera d'autres réglages transverses à l'avenir.
    libelle: 'Paramètres',
    lien: '/administration/parametres',
    icone: '⚙️',
    capacite: 'gerer_parametres',
  },
];

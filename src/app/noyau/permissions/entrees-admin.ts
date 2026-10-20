import { NomCapacite, PermissionsAdmin } from '../../modeles/permissions-admin.model';

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
  // Absent pour un groupe dépliant (voir `sousEntrees`) : pas de lien propre.
  lien?: string;
  icone: string;
  // Un tableau teste en OU (visible si au moins une des capacités est présente) —
  // ex. le menu "Partenaires" unique, dont les onglets ont chacun leur propre droit.
  capacite?: NomCapacite | NomCapacite[];
  // Sans `capacite` : visible pour tout admin connecté (ex. Mon profil), à la
  // différence d'une entrée sans `capacite` ET sans ce flag, réservée au
  // super-admin (ex. Modération de comptes).
  toujoursVisible?: boolean;
  // Groupe dépliant (ex. "Audit") : rendu replié/dépliable dans la barre latérale, visible dès
  // qu'au moins une sous-entrée l'est. Chaque sous-entrée garde son propre droit.
  sousEntrees?: EntreeMenuAdmin[];
}

export const ENTREES_ADMIN: EntreeMenuAdmin[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord', icone: '📊', capacite: 'voir_stats' },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_commandes.
    libelle: 'Commandes',
    lien: '/administration/commandes',
    icone: '🧾',
    capacite: 'gerer_commandes',
  },
  {
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_restaurants. Renommé
    // "Établissements" (branche mathi) : couvre désormais aussi boulangerie/pharmacie/mode/
    // librairie/fast-food (gabarits), pas seulement les restaurants — même écran/capacité.
    libelle: 'Établissements',
    lien: '/administration/etablissements',
    icone: '🏪',
    capacite: 'gerer_restaurants',
  },
  {
    // Mêmes capacités que le groupe "Locations" de la gestion des admins — regroupées ici aussi.
    libelle: 'Locations',
    icone: '🏠',
    sousEntrees: [
      { libelle: 'Loueurs', lien: '/administration/locations', icone: '🏠', capacite: 'gerer_locations' },
      {
        libelle: 'Demandes de location',
        lien: '/administration/demandes-location',
        icone: '📅',
        capacite: 'gerer_reservations',
      },
    ],
  },
  {
    libelle: "Demandes d'intervention",
    lien: '/administration/interventions',
    icone: '🛠️',
    capacite: ['voir_interventions', 'gerer_interventions'],
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
    // Super-admin (toutes capacités à true côté backend) OU capacité gerer_parametres.
    libelle: 'Catégories',
    lien: '/administration/categories',
    icone: '🗂️',
    capacite: 'gerer_parametres',
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
    // Même capacité (lire_journal) pour les deux — regroupées pour alléger le menu.
    libelle: 'Audit',
    icone: '📜',
    sousEntrees: [
      { libelle: "Journal d'audit", lien: '/administration/journal', icone: '📜', capacite: 'lire_journal' },
      { libelle: 'Connexions admin', lien: '/administration/connexions-admin', icone: '🔐', capacite: 'lire_journal' },
    ],
  },
  {
    libelle: 'Paiements',
    lien: '/administration/paiements',
    icone: '💳',
    capacite: 'voir_stats',
  },
  {
    // En bas du menu, juste avant Paramètres : visible pour tout admin connecté.
    libelle: 'Mon profil',
    lien: '/administration/mon-profil',
    icone: '👤',
    toujoursVisible: true,
  },
  {
    // Gestion des admins, Géographie, Recherche et Modération de comptes sont désormais des
    // onglets de cet écran (voir Parametres) ; cette entrée doit donc rester visible pour
    // quiconque a le droit d'au moins l'un de ces onglets, pas seulement gerer_parametres.
    // Tout en bas du menu.
    libelle: 'Paramètres',
    lien: '/administration/parametres',
    icone: '⚙️',
    capacite: ['gerer_parametres', 'gerer_admins', 'gerer_geographie'],
  },
];

/** Une entrée (feuille ou groupe) est-elle visible pour ces permissions ? */
export function entreeAccessible(entree: EntreeMenuAdmin, permissions: PermissionsAdmin): boolean {
  if (entree.capacite) {
    const capacites = Array.isArray(entree.capacite) ? entree.capacite : [entree.capacite];
    return capacites.some((c) => permissions.capacites[c]);
  }
  if (entree.toujoursVisible) {
    return true;
  }
  if (entree.sousEntrees) {
    return entree.sousEntrees.some((sousEntree) => entreeAccessible(sousEntree, permissions));
  }
  return permissions.isSuperuser;
}

/** Première entrée (feuille) accessible, en descendant dans les groupes — même ordre que le menu. */
export function premiereEntreeAccessible(
  entrees: EntreeMenuAdmin[],
  permissions: PermissionsAdmin,
): EntreeMenuAdmin | null {
  for (const entree of entrees) {
    if (entree.sousEntrees) {
      const trouvee = premiereEntreeAccessible(entree.sousEntrees, permissions);
      if (trouvee) {
        return trouvee;
      }
      continue;
    }
    if (entreeAccessible(entree, permissions)) {
      return entree;
    }
  }
  return null;
}

/**
 * Reflète la réponse de GET /administration/mes-permissions/ : rôle et
 * capacités fines de l'admin connecté (grille `PermissionsAdmin` côté backend).
 */

// Les capacités possibles de la grille admin, pour l'autocomplétion lors
// de la déclaration des entrées de menu / des routes protégées.
// `gerer_admins`, `gerer_geographie` et `gerer_formules_pub` sont privilégiées : seul un super-admin peut la poser à true
// (le backend ignore silencieusement toute tentative venant d'un non-superuser).
export type NomCapacite =
  | 'suspendre_client'
  | 'suspendre_partenaire'
  | 'suspendre_admin'
  | 'reactiver_client'
  | 'reactiver_partenaire'
  | 'reactiver_admin'
  | 'bannir_client'
  | 'bannir_partenaire'
  | 'bannir_admin'
  | 'supprimer_soft_client'
  | 'supprimer_soft_partenaire'
  | 'supprimer_soft_admin'
  | 'supprimer_hard_client'
  | 'supprimer_hard_partenaire'
  | 'supprimer_hard_admin'
  | 'restaurer_client'
  | 'restaurer_partenaire'
  | 'restaurer_admin'
  | 'masquer_partenaire'
  | 'certifier_partenaire'
  | 'accorder_faveur'
  | 'valider_devenir_partenaire'
  | 'creer_partenaire'
  | 'valider_publicite'
  | 'offrir_campagne'
  | 'valider_commande'
  | 'valider_paiement'
  | 'modifier_plans_formules'
  | 'voir_stats'
  | 'voir_indicateurs'
  | 'voir_interventions'
  | 'lire_journal'
  | 'exporter_csv'
  | 'gerer_admins'
  | 'gerer_geographie'
  | 'gerer_formules_pub';

// Corps brut renvoyé par le backend (snake_case).
export interface ReponsePermissionsAdmin {
  role: string;
  is_staff: boolean;
  is_superuser: boolean;
  capacites: Record<string, boolean>;
}

/**
 * Modèle applicatif (camelCase). `is_superuser=true` ⇒ le backend renvoie déjà
 * toutes les capacités à `true` — ne pas re-coder cette règle côté front.
 */
export interface PermissionsAdmin {
  role: string;
  isStaff: boolean;
  isSuperuser: boolean;
  capacites: Record<string, boolean>;
}

// Libellés français des capacités, pour la section "Mes droits" de Mon profil
// (affichage lecture seule). Une clé absente de ce dictionnaire est affichée
// telle quelle, `_` remplacés par des espaces.
export const LIBELLES_CAPACITE: Record<NomCapacite, string> = {
  suspendre_client: 'Suspendre un client',
  suspendre_partenaire: 'Suspendre un partenaire',
  suspendre_admin: 'Suspendre un admin',
  reactiver_client: 'Réactiver un client',
  reactiver_partenaire: 'Réactiver un partenaire',
  reactiver_admin: 'Réactiver un admin',
  bannir_client: 'Bannir un client',
  bannir_partenaire: 'Bannir un partenaire',
  bannir_admin: 'Bannir un admin',
  supprimer_soft_client: 'Supprimer (soft) un client',
  supprimer_soft_partenaire: 'Supprimer (soft) un partenaire',
  supprimer_soft_admin: 'Supprimer (soft) un admin',
  supprimer_hard_client: 'Supprimer (définitif) un client',
  supprimer_hard_partenaire: 'Supprimer (définitif) un partenaire',
  supprimer_hard_admin: 'Supprimer (définitif) un admin',
  restaurer_client: 'Restaurer un client',
  restaurer_partenaire: 'Restaurer un partenaire',
  restaurer_admin: 'Restaurer un admin',
  masquer_partenaire: 'Masquer un partenaire',
  certifier_partenaire: 'Certifier un partenaire',
  accorder_faveur: 'Accorder une faveur de plan',
  valider_devenir_partenaire: 'Valider une demande de partenariat',
  creer_partenaire: 'Créer un partenaire',
  valider_publicite: 'Valider une publicité',
  offrir_campagne: 'Offrir une campagne publicitaire',
  valider_commande: 'Valider une commande',
  valider_paiement: 'Valider un paiement',
  modifier_plans_formules: 'Modifier les plans et formules',
  voir_stats: 'Voir les statistiques',
  voir_indicateurs: 'Voir les indicateurs partenaires',
  voir_interventions: "Voir les demandes d'intervention",
  lire_journal: "Lire le journal d'audit",
  exporter_csv: 'Exporter des données (CSV)',
  gerer_admins: 'Gérer les administrateurs',
  gerer_geographie: 'Gérer la géographie',
  gerer_formules_pub: 'Gérer les formules et paramètres pub',
};

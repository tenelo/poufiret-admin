/**
 * Reflète la réponse de GET /administration/mes-permissions/ : rôle et
 * capacités fines de l'admin connecté (grille `PermissionsAdmin` côté backend).
 */

// Les 31 capacités possibles de la grille admin, pour l'autocomplétion lors
// de la déclaration des entrées de menu / des routes protégées.
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
  | 'lire_journal'
  | 'exporter_csv';

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

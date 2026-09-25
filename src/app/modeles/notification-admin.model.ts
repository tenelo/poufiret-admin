/**
 * Reflète /notifications/admin/... (cloche de l'espace admin, comptes is_staff / is_superuser) :
 * campagnes de publicité soumises ou à valider.
 */

// pub_soumise : campagne soumise, en attente de paiement.
// pub_a_valider : paiement confirmé, en attente de validation.
export type TypeNotificationAdmin = 'pub_soumise' | 'pub_a_valider';

export interface NotificationAdmin {
  id: number;
  type: TypeNotificationAdmin;
  titre: string;
  message: string;
  lue: boolean;
  cree_le: string;
  // UUID de la campagne concernée.
  publicite_id: string | null;
  statut_publicite: string | null;
}

/** GET admin/?page_size=10 (option ?non_lues=1). */
export interface ReponseNotificationsAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationAdmin[];
  nb_non_lues: number;
}

/** GET admin/compteur/ (polling toutes les 30 s). */
export interface ReponseCompteurNotificationsAdmin {
  nb_non_lues: number;
}

/** POST admin/tout-lire/. */
export interface ReponseToutLireNotificationsAdmin {
  nb_mises_a_jour: number;
  nb_non_lues: number;
}

/** Onglet de statut de la page Publicités > Campagnes ouvert depuis chaque type de notification. */
export const STATUT_CAMPAGNE_PAR_TYPE: Record<TypeNotificationAdmin, 'en_attente_paiement' | 'en_attente_validation'> = {
  pub_soumise: 'en_attente_paiement',
  pub_a_valider: 'en_attente_validation',
};

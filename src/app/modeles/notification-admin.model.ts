/**
 * Reflète /notifications/admin/... (deux cloches de l'espace admin, comptes is_staff /
 * is_superuser) : canal "restaurant" (commandes restaurant) ou "general" (tout le reste), chacun
 * filtré/marqué-lu séparément via ?canal=.
 */

// pub_soumise : campagne soumise, en attente de paiement.
// pub_a_valider : paiement confirmé, en attente de validation.
// commande_nouvelle : nouvelle commande ; commande_annulee_client : commande annulée par le client.
// reservation_nouvelle : nouvelle demande de location (canal general, cible demandes_location).
// intervention_nouvelle : nouvelle demande d'intervention (canal general, cible interventions).
export type TypeNotificationAdmin =
  | 'pub_soumise'
  | 'pub_a_valider'
  | 'commande_nouvelle'
  | 'commande_annulee_client'
  | 'reservation_nouvelle'
  | 'intervention_nouvelle';

// Canal d'une notification : pilote dans quelle cloche elle apparaît (🍽️ restaurant / 🔔 general).
export type CanalNotificationAdmin = 'restaurant' | 'general';

// Écran cible sur lequel cliquer une notification doit naviguer (voir ClocheNotificationsAdmin).
export type EcranCibleNotificationAdmin = 'commandes' | 'interventions' | 'demandes_location' | 'publicites';

export interface CibleNotificationAdmin {
  ecran: EcranCibleNotificationAdmin;
  id: number;
}

export interface NotificationAdmin {
  id: number;
  type: TypeNotificationAdmin;
  canal: CanalNotificationAdmin;
  titre: string;
  message: string;
  lue: boolean;
  cree_le: string;
  // Présent pour commandes/interventions/demandes_location ; absent pour les campagnes de pub
  // (navigation inchangée, voir publicite_id/statut_publicite ci-dessous).
  cible: CibleNotificationAdmin | null;
  // UUID de la campagne concernée (notifications de publicité uniquement).
  publicite_id: string | null;
  statut_publicite: string | null;
}

/** GET admin/?canal=&page_size=10 (option ?non_lues=1) : nb_non_lues compte seulement le canal demandé. */
export interface ReponseNotificationsAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationAdmin[];
  nb_non_lues: number;
}

/** GET admin/compteur/ (polling toutes les 30 s, un seul appel pour les deux cloches). */
export interface ReponseCompteurNotificationsAdmin {
  restaurant: number;
  general: number;
  nb_non_lues: number;
}

/** POST admin/tout-lire/?canal= : ne marque comme lu que les notifications de ce canal. */
export interface ReponseToutLireNotificationsAdmin {
  nb_mises_a_jour: number;
  nb_non_lues: number;
}

/** Onglet de statut de la page Publicités > Campagnes ouvert depuis chaque type de notification. */
export const STATUT_CAMPAGNE_PAR_TYPE: Partial<
  Record<TypeNotificationAdmin, 'en_attente_paiement' | 'en_attente_validation'>
> = {
  pub_soumise: 'en_attente_paiement',
  pub_a_valider: 'en_attente_validation',
};

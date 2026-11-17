/**
 * Reflète /api/v1/notifications/push-web/... : abonnements Web Push standard (VAPID), gérés via
 * Angular SwPush (voir noyau/notifications/notifications-push-etat.service.ts) — admin et
 * partenaire. Aucun FCM web, aucun service worker personnalisé : ngsw-worker.js gère nativement
 * les événements push/notificationclick.
 */

/** GET push-web/cle-publique/ : clé publique VAPID (base64url), à passer à SwPush.requestSubscription. */
export interface ReponseClePubliquePush {
  cle_publique: string;
}

/**
 * Corps de POST/DELETE push-web/abonnement/ : forme JSON native d'un PushSubscription
 * (PushSubscription.toJSON()), envoyée telle quelle au backend.
 */
export interface RequeteAbonnementPush {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/** Support du navigateur/appareil pour le Web Push (indépendant de l'autorisation). */
export type SupportNotificationsPush = 'supporte' | 'ios_non_installe' | 'non_supporte';

/** Reflète Notification.permission, traduit en français. */
export type PermissionNotificationsPush = 'activee' | 'bloquee' | 'en_attente';

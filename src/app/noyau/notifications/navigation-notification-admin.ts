import { Params } from '@angular/router';

import { CanalNotificationAdmin, EcranCibleNotificationAdmin } from '../../modeles/notification-admin.model';

const ECRANS_CONNUS: readonly EcranCibleNotificationAdmin[] = [
  'commandes',
  'interventions',
  'demandes_location',
  'publicites',
];

/** Valide un écran brut (ex. venu du paramètre `ecran` d'une URL de notification push) : null si absent ou inconnu. */
export function ecranAdminValide(valeur: string | null | undefined): EcranCibleNotificationAdmin | null {
  return ECRANS_CONNUS.includes(valeur as EcranCibleNotificationAdmin)
    ? (valeur as EcranCibleNotificationAdmin)
    : null;
}

export interface DestinationNotificationAdmin {
  chemin: string[];
  queryParams: Params;
}

/**
 * Chemin et queryParams de navigation d'un écran cible admin — logique unique, réutilisée par
 * ClocheNotificationsAdmin (clic sur une notification de la liste, canal/statutPublicite connus)
 * et par le clic sur une notification push (OuvrirNotification / SwPush.notificationClicks,
 * ecran+id seuls, voir notifications-push-etat.service.ts).
 */
export function destinationEcranAdmin(
  ecran: EcranCibleNotificationAdmin,
  id: number | string | null | undefined,
  options: { canal?: CanalNotificationAdmin; statutPublicite?: string | null } = {},
): DestinationNotificationAdmin {
  switch (ecran) {
    case 'commandes':
      return {
        chemin: ['/administration/commandes'],
        queryParams: {
          commande: id ?? undefined,
          // Canal restaurant : pré-filtre le centre des commandes sur la catégorie Restaurants.
          categorie: options.canal === 'restaurant' ? 'restaurants' : undefined,
        },
      };
    case 'interventions':
      return { chemin: ['/administration/interventions'], queryParams: { intervention: id ?? undefined } };
    case 'demandes_location':
      return { chemin: ['/administration/demandes-location'], queryParams: { demande: id ?? undefined } };
    case 'publicites':
      return {
        chemin: ['/administration/publicites'],
        queryParams: { statut: options.statutPublicite ?? undefined, pub: id ?? undefined },
      };
  }
}

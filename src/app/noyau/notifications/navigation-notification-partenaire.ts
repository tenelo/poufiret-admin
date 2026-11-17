import { Params } from '@angular/router';

/**
 * Écrans cibles connus pour une notification partenaire (push web) : commandes (nouvelles,
 * annulations) et demandes (réservations de location/hébergement). Les « messages » (demandes
 * d'intervention) n'ont pas encore d'écran dédié côté partenaire : un écran absent ou inconnu
 * retombe sur le panneau de notifications (voir naviguer-depuis-notification.ts).
 */
export type EcranCibleNotificationPartenaire = 'commandes' | 'demandes';

const ECRANS_CONNUS: readonly EcranCibleNotificationPartenaire[] = ['commandes', 'demandes'];

/** Valide un écran brut (ex. venu du paramètre `ecran` d'une URL de notification push) : null si absent ou inconnu. */
export function ecranPartenaireValide(valeur: string | null | undefined): EcranCibleNotificationPartenaire | null {
  return ECRANS_CONNUS.includes(valeur as EcranCibleNotificationPartenaire)
    ? (valeur as EcranCibleNotificationPartenaire)
    : null;
}

export interface DestinationNotificationPartenaire {
  chemin: string[];
  queryParams: Params;
}

export function destinationEcranPartenaire(
  ecran: EcranCibleNotificationPartenaire,
  id: number | string | null | undefined,
): DestinationNotificationPartenaire {
  switch (ecran) {
    case 'commandes':
      return { chemin: ['/mes-commandes'], queryParams: { commande: id ?? undefined } };
    case 'demandes':
      return { chemin: ['/mes-demandes'], queryParams: { demande: id ?? undefined } };
  }
}

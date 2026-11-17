import { Router } from '@angular/router';

import { RoleUtilisateur } from '../../modeles/utilisateur.model';
import { DemandePanneauNotificationsService } from './demande-panneau-notifications.service';
import { destinationEcranAdmin, ecranAdminValide } from './navigation-notification-admin';
import { destinationEcranPartenaire, ecranPartenaireValide } from './navigation-notification-partenaire';

/**
 * Navigue vers l'écran cible d'une notification push (ecran+id seuls, sans canal ni type — ce
 * qui distingue ce flux du clic sur une notification de la liste, voir ClocheNotificationsAdmin).
 * Écran absent ou inconnu (ou rôle non concerné, ex. client) : ouvre le panneau de notifications
 * sur le tableau de bord plutôt que d'échouer silencieusement.
 *
 * Utilisée par OuvrirNotification (URL .../notifications/ouvrir?ecran=&id=, route de la fenêtre
 * ouverte par le service worker — voir ngsw `data.onActionClick`) ET par
 * NotificationsPushEtatService (SwPush.notificationClicks, app déjà ouverte dans un onglet) :
 * même logique dans les deux cas, comme demandé.
 */
export function naviguerDepuisNotificationPush(
  router: Router,
  role: RoleUtilisateur | null,
  demandePanneau: DemandePanneauNotificationsService,
  ecranBrut: string | null | undefined,
  id: string | null | undefined,
  options: { replaceUrl?: boolean } = {},
): void {
  const navExtras = { replaceUrl: options.replaceUrl ?? false };

  if (role === 'admin') {
    const ecran = ecranAdminValide(ecranBrut);
    if (ecran) {
      const destination = destinationEcranAdmin(ecran, id);
      void router.navigate(destination.chemin, { queryParams: destination.queryParams, ...navExtras });
      return;
    }
  } else if (role === 'partenaire') {
    const ecran = ecranPartenaireValide(ecranBrut);
    if (ecran) {
      const destination = destinationEcranPartenaire(ecran, id);
      void router.navigate(destination.chemin, { queryParams: destination.queryParams, ...navExtras });
      return;
    }
  }

  demandePanneau.demander();
  void router.navigate(['/tableau-de-bord'], navExtras);
}

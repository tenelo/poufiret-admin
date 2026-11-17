import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { DemandePanneauNotificationsService } from '../../../noyau/notifications/demande-panneau-notifications.service';
import { naviguerDepuisNotificationPush } from '../../../noyau/notifications/naviguer-depuis-notification';

/**
 * Destination de toute notification push (admin ou partenaire) : le backend envoie toujours
 * .../notifications/ouvrir?ecran=<ecran>&id=<id> (voir data.onActionClick côté service worker).
 * Redirige aussitôt vers le bon écran (même logique que ClocheNotificationsAdmin.ouvrirNotification,
 * voir naviguer-depuis-notification.ts), ou vers le panneau de notifications si l'écran est absent
 * ou inconnu. Ne reste jamais dans l'historique (replaceUrl) : un retour arrière doit quitter cette
 * route transitoire, pas y revenir.
 */
@Component({
  selector: 'app-ouvrir-notification',
  imports: [],
  templateUrl: './ouvrir-notification.html',
  styleUrl: './ouvrir-notification.scss',
})
export class OuvrirNotification implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly demandePanneau = inject(DemandePanneauNotificationsService);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    naviguerDepuisNotificationPush(
      this.router,
      this.authService.role(),
      this.demandePanneau,
      params.get('ecran'),
      params.get('id'),
      { replaceUrl: true },
    );
  }
}

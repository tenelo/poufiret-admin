import { Component, inject } from '@angular/core';

import { NotificationsPushEtatService } from '../../../noyau/notifications/notifications-push-etat.service';

/**
 * Bloc d'état et d'actions du Web Push (voir NotificationsPushEtatService) : bouton « Activer les
 * notifications » (jamais appelé automatiquement), messages d'état (activé / bloqué / non
 * supporté, avec le cas particulier iPhone), « Désactiver sur cet appareil » et « Envoyer une
 * notification de test ». Entièrement autonome (lit/pilote directement le service partagé) :
 * utilisé à l'identique dans les cloches admin et partenaire, et dans Mon profil (CarteMonCompte).
 */
@Component({
  selector: 'app-etat-notifications-push',
  imports: [],
  templateUrl: './etat-notifications-push.html',
  styleUrl: './etat-notifications-push.scss',
})
export class EtatNotificationsPush {
  readonly etat = inject(NotificationsPushEtatService);

  activer(): void {
    this.etat.activer();
  }

  desactiver(): void {
    this.etat.desactiverSurCetAppareil();
  }

  envoyerTest(): void {
    this.etat.envoyerTest();
  }
}

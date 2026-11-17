import { Injectable, signal } from '@angular/core';

/**
 * Signal partagé : demande d'ouverture du panneau de notifications (cloche admin ou partenaire),
 * utilisé quand une notification push est cliquée sans écran cible exploitable (absent ou inconnu
 * — voir OuvrirNotification et naviguer-depuis-notification.ts). Les cloches, toujours montées
 * dans l'en-tête (en-tete.html), consomment la demande via un effect() et retiennent le dernier
 * jeton traité pour ne jamais ouvrir deux fois le même.
 */
@Injectable({ providedIn: 'root' })
export class DemandePanneauNotificationsService {
  private readonly jetonInterne = signal(0);
  readonly jeton = this.jetonInterne.asReadonly();

  /** Incrémente le jeton : chaque appel est une nouvelle demande, même consécutive. */
  demander(): void {
    this.jetonInterne.update((v) => v + 1);
  }
}

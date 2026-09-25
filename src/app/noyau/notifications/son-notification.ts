import { DestroyRef } from '@angular/core';

/** Son joué par les cloches de notification (espaces partenaire et admin). */
export const CHEMIN_SON_NOTIFICATION = 'sons/notification.wav';

/**
 * Lecture du son de notification, partagée par les cloches. Les navigateurs interdisent la
 * lecture audio automatique tant que l'utilisateur n'a pas interagi avec la page : le son n'est
 * donc joué qu'après un premier clic ou une première touche.
 * À instancier dans un contexte d'injection (champ de composant) : les écouteurs sont retirés à
 * la destruction du composant.
 */
export class SonNotification {
  private interactionEffectuee = false;

  constructor(
    destroyRef: DestroyRef,
    private readonly lecteur: () => HTMLAudioElement | undefined,
  ) {
    const marquerInteraction = () => {
      this.interactionEffectuee = true;
    };
    document.addEventListener('pointerdown', marquerInteraction, { once: true });
    document.addEventListener('keydown', marquerInteraction, { once: true });
    destroyRef.onDestroy(() => {
      document.removeEventListener('pointerdown', marquerInteraction);
      document.removeEventListener('keydown', marquerInteraction);
    });
  }

  jouer(): void {
    if (!this.interactionEffectuee) {
      return;
    }
    const audio = this.lecteur();
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Lecture bloquée par le navigateur : pas grave, la cloche visuelle suffit.
    });
  }
}

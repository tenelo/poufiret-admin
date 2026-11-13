import { DestroyRef, signal } from '@angular/core';

/** Son joué par les cloches de notification (espaces partenaire et admin). */
export const CHEMIN_SON_NOTIFICATION = 'sons/notification.wav';

/**
 * Lecture du son de notification, partagée par les cloches. Les navigateurs interdisent la
 * lecture audio automatique tant que l'utilisateur n'a pas interagi avec la page : le son n'est
 * donc joué qu'après un premier clic ou une première touche.
 * À instancier dans un contexte d'injection (champ de composant) : les écouteurs sont retirés à
 * la destruction du composant.
 *
 * `bloque`/`debloquer()` sont additifs (cloche admin : bouton « Activer le son ») et n'affectent
 * pas le comportement existant de `jouer()` ci-dessous — la cloche partenaire, qui ne les utilise
 * pas, se comporte exactement comme avant.
 */
export class SonNotification {
  private interactionEffectuee = false;
  private readonly bloqueInterne = signal(false);

  /** Vrai tant que le navigateur bloque la lecture (pas encore d'interaction, ou une lecture a
   *  déjà échoué) : à utiliser pour afficher un bouton « Activer le son ». */
  readonly bloque = this.bloqueInterne.asReadonly();

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
      this.bloqueInterne.set(true);
      return;
    }
    const audio = this.lecteur();
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    audio
      .play()
      .then(() => this.bloqueInterne.set(false))
      .catch(() => {
        // Lecture bloquée par le navigateur : pas grave, la cloche visuelle suffit.
        this.bloqueInterne.set(true);
      });
  }

  /**
   * Débloque explicitement la lecture (clic sur « Activer le son ») : joue puis coupe aussitôt,
   * dans le geste utilisateur lui-même, pour satisfaire la contrainte du navigateur une fois pour
   * toutes.
   */
  debloquer(): void {
    this.interactionEffectuee = true;
    const audio = this.lecteur();
    if (!audio) {
      this.bloqueInterne.set(false);
      return;
    }
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        this.bloqueInterne.set(false);
      })
      .catch(() => this.bloqueInterne.set(true));
  }
}

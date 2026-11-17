import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

import { NotificationsPushEtatService } from '../../../noyau/notifications/notifications-push-etat.service';
import { EtatNotificationsPush } from '../../notifications-push/etat-notifications-push/etat-notifications-push';

/**
 * Petit bouton de réglages (même gabarit qu'une cloche, voir cloche-commune.scss) placé à côté des
 * cloches dans l'en-tête : regroupe « Activer le son » et l'état/actions du Web Push
 * (EtatNotificationsPush, inchangé) dans un panneau déroulant, plutôt que de les afficher en
 * permanence dans l'en-tête (cause du bug de mise en page — débordement, voir ClocheNotificationsAdmin).
 *
 * Masqué entièrement tant qu'aucune action n'est utile (son débloqué ET push déjà activé/non
 * supporté) : rien n'est ajouté à l'en-tête dans l'état « tout va bien ». Dès qu'une action est
 * possible (son bloqué, ou push supporté mais pas encore activé), un point rouge apparaît sur
 * l'icône. Une fois ouvert, reste affiché jusqu'à fermeture explicite (re-clic, clic extérieur,
 * Échap) même si l'action se résout entre-temps, pour laisser le temps de lire le résultat.
 *
 * Partagé par les cloches admin et partenaire (un seul bouton, jamais un par cloche) ; les mêmes
 * réglages restent accessibles en permanence dans Mon profil (CarteMonCompte), via
 * EtatNotificationsPush directement.
 */
@Component({
  selector: 'app-menu-reglages-notifications',
  imports: [EtatNotificationsPush],
  templateUrl: './menu-reglages-notifications.html',
  styleUrl: './menu-reglages-notifications.scss',
})
export class MenuReglagesNotifications {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly notificationsPush = inject(NotificationsPushEtatService);

  /** Vrai tant que la lecture du son est bloquée sur cet appareil (voir SonNotification.bloque). */
  readonly sonBloque = input.required<boolean>();
  /** Clic sur « Activer le son » dans le panneau : à la charge du composant appelant (son.debloquer()). */
  readonly activerSon = output<void>();

  private readonly ouvertInterne = signal(false);
  readonly ouvert = this.ouvertInterne.asReadonly();

  readonly besoinAttention = computed(
    () =>
      this.sonBloque() ||
      (this.notificationsPush.support() === 'supporte' && !this.notificationsPush.actifEtAutorise()),
  );

  /** Visible dès qu'une action est utile, ou tant que l'utilisateur l'a ouvert lui-même. */
  readonly visible = computed(() => this.besoinAttention() || this.ouvert());

  basculer(): void {
    this.ouvertInterne.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  fermer(): void {
    this.ouvertInterne.set(false);
  }

  /** Clic hors de ce composant pendant que le panneau est ouvert : le referme. */
  @HostListener('document:click', ['$event'])
  surClicDocument(evenement: MouseEvent): void {
    if (this.ouvert() && !this.elementRef.nativeElement.contains(evenement.target as Node)) {
      this.ouvertInterne.set(false);
    }
  }
}

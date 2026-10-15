import { Component, ElementRef, HostListener, inject, input, output } from '@angular/core';

import { NotificationAdmin } from '../../../../modeles/notification-admin.model';
import { formaterDateRelative } from '../../../formater-date-relative';

/**
 * Une cloche de notifications (bouton + panneau), purement présentationnelle : l'état
 * (compteur, liste, chargement…) et les appels réseau restent dans ClocheNotificationsAdmin, qui
 * en affiche deux instances (canal "restaurant" et canal "general") — évite de dupliquer deux fois
 * ce même gabarit HTML. Le panneau est un simple `position: absolute` ancré sous le bouton (pas de
 * voile plein écran en `position: fixed`, trop sensible aux ancêtres qui créent un nouveau bloc
 * conteneur — transform/filter/contain) : la fermeture au clic extérieur est gérée ici par un
 * écouteur document, limité à CETTE instance (host.contains(cible)).
 */
@Component({
  selector: 'app-cloche-canal',
  imports: [],
  templateUrl: './cloche-canal.html',
  styleUrl: './cloche-canal.scss',
})
export class ClocheCanal {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  // Classe CSS ajoutée à .bouton-cloche : pilote la couleur de l'icône (SVG, voir le gabarit) —
  // jaune pour "cloche-restaurant", bleue pour "cloche-generale". Un emoji 🔔 ne peut pas être
  // recoloré en CSS (couleurs figées par la police), d'où une icône SVG inline ici.
  readonly classeCouleur = input('');
  // Texte d'accessibilité, ex. "notifications Restaurants" (complété par le nombre non lues).
  readonly libelleAccessibilite = input.required<string>();
  // Titre affiché en haut du panneau, ex. "Restaurants" / "Général".
  readonly titrePanneau = input.required<string>();

  readonly nbNonLues = input.required<number>();
  readonly texteBadge = input.required<string>();
  readonly enAnimation = input(false);
  readonly panneauOuvert = input(false);
  readonly chargementEnCours = input(false);
  readonly erreur = input<string | null>(null);
  readonly notifications = input.required<NotificationAdmin[]>();

  readonly bascule = output<void>();
  readonly toutLire = output<void>();
  readonly ouvrir = output<NotificationAdmin>();

  readonly formaterDateRelative = formaterDateRelative;

  /** Clic hors de CETTE cloche (bouton + panneau) pendant qu'elle est ouverte : la referme. */
  @HostListener('document:click', ['$event'])
  surClicDocument(evenement: MouseEvent): void {
    if (this.panneauOuvert() && !this.elementRef.nativeElement.contains(evenement.target as Node)) {
      this.bascule.emit();
    }
  }
}

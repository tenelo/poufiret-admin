import { Component, input, output } from '@angular/core';

import { NotificationAdmin } from '../../../../modeles/notification-admin.model';
import { formaterDateRelative } from '../../../formater-date-relative';

/**
 * Une cloche de notifications (bouton + panneau), purement présentationnelle : l'état
 * (compteur, liste, chargement…) et les appels réseau restent dans ClocheNotificationsAdmin, qui
 * en affiche deux instances (canal "restaurant" et canal "general") — évite de dupliquer deux fois
 * ce même gabarit HTML.
 */
@Component({
  selector: 'app-cloche-canal',
  imports: [],
  templateUrl: './cloche-canal.html',
  styleUrl: './cloche-canal.scss',
})
export class ClocheCanal {
  // Emoji affiché dans le bouton (🍽️ ou 🔔).
  readonly icone = input.required<string>();
  // Classe CSS ajoutée à .bouton-cloche pour sa couleur propre (ex. "cloche-generale" = bleu).
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
}

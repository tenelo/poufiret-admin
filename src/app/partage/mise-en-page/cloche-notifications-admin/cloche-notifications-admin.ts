import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { NotificationsAdminService } from '../../../noyau/notifications/notifications-admin.service';
import { CHEMIN_SON_NOTIFICATION, SonNotification } from '../../../noyau/notifications/son-notification';
import { extraireMessageErreur } from '../../../fonctionnalites/administration/tableau-de-bord-admin/extraire-message-erreur';
import {
  NotificationAdmin,
  ReponseCompteurNotificationsAdmin,
  STATUT_CAMPAGNE_PAR_TYPE,
} from '../../../modeles/notification-admin.model';
import { formaterDateRelative } from '../../formater-date-relative';

const INTERVALLE_POLLING_MS = 30000;
const DUREE_ANIMATION_MS = 1200;
const NB_NOTIFICATIONS_AFFICHEES = 10;

/**
 * Cloche de notifications de l'en-tête admin / super-admin : campagnes de publicité soumises ou à
 * valider. Compteur interrogé toutes les 30 s (en pause quand l'onglet du navigateur est masqué),
 * son et animation quand il augmente, panneau des 10 dernières notifications. Même moteur de
 * détection (DetecteurCompteur) et même son que la cloche partenaire.
 */
@Component({
  selector: 'app-cloche-notifications-admin',
  imports: [],
  providers: [DetecteurCompteur],
  templateUrl: './cloche-notifications-admin.html',
  styleUrl: './cloche-notifications-admin.scss',
})
export class ClocheNotificationsAdmin implements OnInit {
  private readonly detecteur = inject(DetecteurCompteur<ReponseCompteurNotificationsAdmin>);
  private readonly service = inject(NotificationsAdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly lecteurAudio = viewChild<ElementRef<HTMLAudioElement>>('lecteurAudio');
  private readonly son = new SonNotification(this.destroyRef, () => this.lecteurAudio()?.nativeElement);

  readonly cheminSon = CHEMIN_SON_NOTIFICATION;
  readonly formaterDateRelative = formaterDateRelative;

  readonly nbNonLues = this.detecteur.compteur;
  /** Texte du badge : masqué à 0 (voir le template), « 99+ » au-delà de 99. */
  readonly texteBadge = computed(() => (this.nbNonLues() > 99 ? '99+' : String(this.nbNonLues())));

  readonly enAnimation = signal(false);
  readonly panneauOuvert = signal(false);
  readonly chargementEnCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly notifications = signal<NotificationAdmin[]>([]);

  constructor() {
    // effect() doit être appelé dans un contexte d'injection (constructeur).
    effect(() => {
      if (this.detecteur.aAugmente()) {
        this.declencherNotification();
      }
    });
  }

  ngOnInit(): void {
    // Le polling s'arrête avec le composant : l'en-tête est détruit à la déconnexion.
    this.detecteur.demarrer({
      charger: () => this.service.compteur(),
      selectionnerCompteur: (reponse) => reponse.nb_non_lues,
      intervalleMs: INTERVALLE_POLLING_MS,
      actif: () => this.authService.role() === 'admin',
      pauseSiOngletMasque: true,
    });
  }

  basculerPanneau(): void {
    const ouverture = !this.panneauOuvert();
    this.panneauOuvert.set(ouverture);
    if (ouverture) {
      this.chargerNotifications();
    }
  }

  @HostListener('document:keydown.escape')
  fermerPanneau(): void {
    this.panneauOuvert.set(false);
  }

  private chargerNotifications(): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.lister(NB_NOTIFICATIONS_AFFICHEES).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.notifications.set(reponse.results);
        this.detecteur.definirCompteur(reponse.nb_non_lues);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  toutMarquerCommeLu(): void {
    this.service.toutLire().subscribe({
      next: (reponse) => {
        this.notifications.update((liste) => liste.map((n) => ({ ...n, lue: true })));
        this.detecteur.definirCompteur(reponse.nb_non_lues);
      },
      error: (erreur: unknown) => this.erreur.set(extraireMessageErreur(erreur)),
    });
  }

  /**
   * Marque la notification comme lue, ferme le panneau puis ouvre la page Publicités > Campagnes
   * sur l'onglet de statut correspondant, avec la campagne concernée mise en évidence.
   */
  ouvrirNotification(notification: NotificationAdmin): void {
    if (!notification.lue) {
      this.service.lire(notification.id).subscribe({
        next: () => {
          this.notifications.update((liste) =>
            liste.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)),
          );
          this.detecteur.definirCompteur(Math.max(0, this.nbNonLues() - 1));
        },
        error: () => {
          // Non bloquant : la navigation a lieu quand même, le compteur se recalera au prochain polling.
        },
      });
    }

    this.fermerPanneau();
    this.router.navigate(['/administration/publicites'], {
      queryParams: {
        statut: STATUT_CAMPAGNE_PAR_TYPE[notification.type],
        pub: notification.publicite_id ?? undefined,
      },
    });
  }

  private declencherNotification(): void {
    this.enAnimation.set(true);
    setTimeout(() => this.enAnimation.set(false), DUREE_ANIMATION_MS);
    this.son.jouer();
    this.detecteur.accuserAugmentation();
  }
}

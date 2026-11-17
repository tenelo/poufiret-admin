import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';

import { AuthService } from '../auth/auth.service';
import { RequeteAbonnementPush, PermissionNotificationsPush, SupportNotificationsPush } from '../../modeles/notification-push.model';
import { DemandePanneauNotificationsService } from './demande-panneau-notifications.service';
import { extraireMessageErreur } from './extraire-message-erreur';
import { naviguerDepuisNotificationPush } from './naviguer-depuis-notification';
import { NotificationsPushService } from './notifications-push.service';

/** Apple restreint l'API Push à Safari sur un site installé sur l'écran d'accueil (iOS 16.4+). */
function estAppareilIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Lecture de l'autorisation système courante, derrière un jeton injectable : `Notification` n'est
 * pas toujours présente (navigateur non supporté) et sa valeur n'est pas substituable par `spyOn`
 * dans les tests — même pattern que RECHARGER_PAGE (mise-a-jour.service.ts).
 */
export const LIRE_PERMISSION_NOTIFICATION = new InjectionToken<() => NotificationPermission>(
  'LIRE_PERMISSION_NOTIFICATION',
  { providedIn: 'root', factory: () => () => ('Notification' in window ? Notification.permission : 'default') },
);

/** Query params de l'URL cible d'une notification (.../notifications/ouvrir?ecran=&id=). */
function extraireParamsUrlNotification(url: string | undefined): { ecran: string | null; id: string | null } {
  if (!url) {
    return { ecran: null, id: null };
  }
  try {
    const analysee = new URL(url, window.location.origin);
    return { ecran: analysee.searchParams.get('ecran'), id: analysee.searchParams.get('id') };
  } catch {
    return { ecran: null, id: null };
  }
}

/**
 * Orchestration du Web Push standard (VAPID) via SwPush : support/permission/abonnement de cet
 * appareil, activation/désactivation, notification de test, et navigation au clic (en plus de la
 * route /notifications/ouvrir — voir naviguer-depuis-notification.ts — pour le cas où l'app est
 * déjà ouverte dans un onglet : SwPush.notificationClicks se déclenche alors aussi, le service
 * worker ne naviguant pas lui-même le routeur Angular).
 *
 * Partagé par les cloches admin/partenaire (bouton « Activer les notifications », gating du son —
 * voir ClocheNotificationsAdmin/ClocheNotifications) et par Mon profil (CarteMonCompte, état +
 * « Désactiver sur cet appareil » + « Envoyer une notification de test »).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsPushEtatService {
  private readonly swPush = inject(SwPush);
  private readonly service = inject(NotificationsPushService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly demandePanneau = inject(DemandePanneauNotificationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lirePermissionNavigateur = inject(LIRE_PERMISSION_NOTIFICATION);

  /** Abonnement courant de cet appareil (null si aucun), tenu à jour par SwPush lui-même. */
  private readonly abonnementActuel = toSignal(this.swPush.subscription, { initialValue: null });

  readonly abonneSurCetAppareil = computed(() => !!this.abonnementActuel());

  private readonly permissionInterne = signal<PermissionNotificationsPush>(this.lirePermission());
  readonly permission = this.permissionInterne.asReadonly();

  /** Indépendant de l'autorisation : capacités du navigateur/appareil (push + service worker actif). */
  readonly support = computed<SupportNotificationsPush>(() => {
    const disponible = this.swPush.isEnabled && 'Notification' in window && 'PushManager' in window;
    if (disponible) {
      return 'supporte';
    }
    return estAppareilIos() ? 'ios_non_installe' : 'non_supporte';
  });

  /** À utiliser pour éviter le double son (voir ClocheNotificationsAdmin/ClocheNotifications). */
  readonly actifEtAutorise = computed(
    () => this.abonneSurCetAppareil() && this.permissionInterne() === 'activee',
  );

  readonly enCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  constructor() {
    // Clic sur une notification pendant que l'app est déjà ouverte dans un onglet : le service
    // worker ne navigue pas lui-même le routeur Angular (voir doc de classe) — on le fait ici,
    // avec la même logique que la route /notifications/ouvrir.
    const abonnementClics = this.swPush.notificationClicks.subscribe(({ notification }) => {
      const url = (notification.data as { onActionClick?: { default?: { url?: string } } } | undefined)
        ?.onActionClick?.default?.url;
      const { ecran, id } = extraireParamsUrlNotification(url);
      naviguerDepuisNotificationPush(this.router, this.authService.role(), this.demandePanneau, ecran, id);
    });
    this.destroyRef.onDestroy(() => abonnementClics.unsubscribe());

    // Vit dans un service racine (jamais détruit en pratique) : surveille les révocations de
    // permission faites depuis les réglages du navigateur, en dehors de cette app.
    this.ecouterChangementsPermission();
  }

  /** Active les notifications sur cet appareil : clé publique, abonnement SwPush, enregistrement backend. */
  activer(): void {
    if (this.enCours() || this.support() !== 'supporte') {
      return;
    }
    this.enCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.service.clePublique().subscribe({
      next: ({ cle_publique }) => {
        this.swPush
          .requestSubscription({ serverPublicKey: cle_publique })
          .then((abonnement) => {
            const corps = abonnement.toJSON() as RequeteAbonnementPush;
            this.service.enregistrerAbonnement(corps).subscribe({
              next: () => {
                this.enCours.set(false);
                this.permissionInterne.set(this.lirePermission());
                this.messageSucces.set('Notifications activées sur cet appareil.');
              },
              error: (erreur: unknown) => {
                this.enCours.set(false);
                this.messageErreur.set(extraireMessageErreur(erreur));
              },
            });
          })
          .catch(() => {
            this.enCours.set(false);
            this.permissionInterne.set(this.lirePermission());
            if (this.permissionInterne() !== 'bloquee') {
              this.messageErreur.set("Impossible d'activer les notifications sur cet appareil.");
            }
          });
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  /** Retire l'abonnement de cet appareil : backend d'abord (best-effort), puis SwPush. */
  desactiverSurCetAppareil(): void {
    const abonnement = this.abonnementActuel();
    if (this.enCours() || !abonnement) {
      return;
    }
    this.enCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    const corps = abonnement.toJSON() as RequeteAbonnementPush;
    this.service.supprimerAbonnement(corps).subscribe({
      next: () => this.terminerDesactivation(),
      // Le backend ne sait plus cet appareil : on désabonne quand même localement (sinon
      // l'appareil resterait « activé » dans l'UI sans jamais pouvoir se désactiver).
      error: () => this.terminerDesactivation(),
    });
  }

  private terminerDesactivation(): void {
    void this.swPush.unsubscribe().finally(() => {
      this.enCours.set(false);
      this.messageSucces.set('Notifications désactivées sur cet appareil.');
    });
  }

  envoyerTest(): void {
    if (this.enCours() || !this.actifEtAutorise()) {
      return;
    }
    this.enCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.service.envoyerTest().subscribe({
      next: () => {
        this.enCours.set(false);
        this.messageSucces.set('Notification de test envoyée.');
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  private lirePermission(): PermissionNotificationsPush {
    switch (this.lirePermissionNavigateur()) {
      case 'granted':
        return 'activee';
      case 'denied':
        return 'bloquee';
      default:
        return 'en_attente';
    }
  }

  /** Permissions API (navigator.permissions) : facultative, ignorée silencieusement si absente. */
  private ecouterChangementsPermission(): void {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return;
    }
    navigator.permissions
      .query({ name: 'notifications' as PermissionName })
      .then((statut) => {
        statut.onchange = () => this.permissionInterne.set(this.lirePermission());
      })
      .catch(() => undefined);
  }
}

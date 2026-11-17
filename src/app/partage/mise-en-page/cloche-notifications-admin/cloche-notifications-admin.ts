import { Component, DestroyRef, HostListener, OnInit, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { CoordinateurSonAdmin } from '../../../noyau/notifications/coordinateur-son-admin';
import { DemandePanneauNotificationsService } from '../../../noyau/notifications/demande-panneau-notifications.service';
import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { NotificationsAdminService } from '../../../noyau/notifications/notifications-admin.service';
import { NotificationsAdminWebSocket } from '../../../noyau/notifications/notifications-admin-websocket';
import { NotificationsPushEtatService } from '../../../noyau/notifications/notifications-push-etat.service';
import { destinationEcranAdmin } from '../../../noyau/notifications/navigation-notification-admin';
import { SonNotification } from '../../../noyau/notifications/son-notification';
import { ClocheCanal } from './cloche-canal/cloche-canal';
import { extraireMessageErreur } from '../../../fonctionnalites/administration/tableau-de-bord-admin/extraire-message-erreur';
import {
  CanalNotificationAdmin,
  EcranCibleNotificationAdmin,
  NotificationAdmin,
  ReponseCompteurNotificationsAdmin,
  STATUT_CAMPAGNE_PAR_TYPE,
  TypeNotificationAdmin,
} from '../../../modeles/notification-admin.model';
import { formaterDateRelative } from '../../formater-date-relative';

// Secours REST : actif seulement tant que le WebSocket est coupé (voir NotificationsAdminWebSocket).
const INTERVALLE_SECOURS_MS = 60000;
const DUREE_ANIMATION_MS = 1200;
const NB_NOTIFICATIONS_AFFICHEES = 10;

/** État (compteur/chargement/erreur/liste) d'un seul canal — voir `etatsParCanal` ci-dessous. */
interface EtatCanalAdmin {
  nonLues: WritableSignal<number>;
  chargement: WritableSignal<boolean>;
  erreur: WritableSignal<string | null>;
  notifications: WritableSignal<NotificationAdmin[]>;
}

function creerEtatCanalAdmin(): EtatCanalAdmin {
  return { nonLues: signal(0), chargement: signal(false), erreur: signal(null), notifications: signal([]) };
}

/**
 * Trois cloches de notifications de l'en-tête admin / super-admin, chacune pour son canal, dans
 * l'ordre Restaurants / Services / Autres : même icône (couleur standard jaune orangé) pour les
 * trois, seule la pastille change (rouge / bleue / verte, voir cloche-canal.scss). Restaurants =
 * commandes restaurant, fast-foods, grilleurs, boulangeries ; Services = interventions et
 * réservations ; Autres = tout le reste (campagnes de pub, autres commandes, changements de
 * numéro…).
 * Compteurs en temps réel via WebSocket (NotificationsAdminWebSocket) : son/animation dès qu'un
 * message porte `nouvelle: true`, au même instant que la mise à jour des chiffres. Secours REST
 * (DetecteurCompteur, GET compteur/) toutes les 60 s tant que le WebSocket est coupé, son sur une
 * hausse du total OU de l'un des trois canaux. Un seul onglet admin — le premier à débloquer son
 * son — sonne en continu, y compris en arrière-plan (élection par navigator.locks, voir
 * CoordinateurSonAdmin) ; les compteurs, eux, se mettent à jour dans tous les onglets. Chaque
 * cloche a son propre panneau, sa propre liste et son propre « Tout marquer comme lu »
 * (POST tout-lire/?canal=). Aucun bouton « Activer le son » ni réglage Web Push dans l'en-tête :
 * le son se débloque tout seul à la première interaction (SonNotification) et l'activation des
 * notifications Web Push ne vit que dans Mon profil (EtatNotificationsPush). Même son que la
 * cloche partenaire.
 */
@Component({
  selector: 'app-cloche-notifications-admin',
  imports: [ClocheCanal],
  providers: [DetecteurCompteur, NotificationsAdminWebSocket],
  templateUrl: './cloche-notifications-admin.html',
  styleUrl: './cloche-notifications-admin.scss',
})
export class ClocheNotificationsAdmin implements OnInit {
  // Secours REST uniquement désormais (voir ngOnInit) : le temps réel passe par wsAdmin.
  private readonly detecteur = inject(DetecteurCompteur<ReponseCompteurNotificationsAdmin>);
  private readonly wsAdmin = inject(NotificationsAdminWebSocket);
  private readonly service = inject(NotificationsAdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationsPush = inject(NotificationsPushEtatService);
  private readonly demandePanneau = inject(DemandePanneauNotificationsService);

  private readonly son = new SonNotification(this.destroyRef);
  private readonly coordinateurSon = new CoordinateurSonAdmin(this.destroyRef);
  private dernierJetonPanneauTraite = 0;

  readonly formaterDateRelative = formaterDateRelative;

  readonly enAnimation = signal(false);

  // Dernières valeurs connues (WebSocket ou secours REST), pour détecter une hausse sur CHAQUE
  // canal côté secours REST (qui ne porte pas de `nouvelle` — voir l'effet correspondant).
  private precedent: ReponseCompteurNotificationsAdmin | null = null;

  // Au plus un panneau ouvert à la fois : null = les trois fermés, sinon le canal ouvert.
  readonly canalOuvert = signal<CanalNotificationAdmin | null>(null);
  readonly panneauOuvertRestaurant = computed(() => this.canalOuvert() === 'restaurant');
  readonly panneauOuvertService = computed(() => this.canalOuvert() === 'service');
  readonly panneauOuvertGeneral = computed(() => this.canalOuvert() === 'general');

  // Un jeu de signaux par canal (nb non lues/chargement/erreur/liste) : évite de tripler chaque
  // méthode ci-dessous en trois branches quasi identiques.
  private readonly etatsParCanal: Record<CanalNotificationAdmin, EtatCanalAdmin> = {
    restaurant: creerEtatCanalAdmin(),
    service: creerEtatCanalAdmin(),
    general: creerEtatCanalAdmin(),
  };

  // ---- Canal "restaurant" ----
  readonly nbNonLuesRestaurant = this.etatsParCanal.restaurant.nonLues.asReadonly();
  readonly chargementRestaurant = this.etatsParCanal.restaurant.chargement.asReadonly();
  readonly erreurRestaurant = this.etatsParCanal.restaurant.erreur.asReadonly();
  readonly notificationsRestaurant = this.etatsParCanal.restaurant.notifications.asReadonly();

  // ---- Canal "service" ----
  readonly nbNonLuesService = this.etatsParCanal.service.nonLues.asReadonly();
  readonly chargementService = this.etatsParCanal.service.chargement.asReadonly();
  readonly erreurService = this.etatsParCanal.service.erreur.asReadonly();
  readonly notificationsService = this.etatsParCanal.service.notifications.asReadonly();

  // ---- Canal "general" (Autres) ----
  readonly nbNonLuesGeneral = this.etatsParCanal.general.nonLues.asReadonly();
  readonly chargementGeneral = this.etatsParCanal.general.chargement.asReadonly();
  readonly erreurGeneral = this.etatsParCanal.general.erreur.asReadonly();
  readonly notificationsGeneral = this.etatsParCanal.general.notifications.asReadonly();

  constructor() {
    // effect() doit être appelé dans un contexte d'injection (constructeur).

    // Dès que le son devient débloqué (clic « Activer le son », ou 1re interaction quelconque),
    // cet onglet se porte candidat au rôle de sonneur unique (voir CoordinateurSonAdmin) — jamais
    // tant qu'il reste muet, pour qu'un onglet muet ne soit jamais élu.
    effect(() => {
      if (!this.son.bloque()) {
        this.coordinateurSon.demanderElection();
      }
    });

    // Notification push cliquée sans écran cible exploitable (voir naviguer-depuis-notification.ts) :
    // ouvre le panneau général. Jeton consommé une seule fois (comparé au dernier traité).
    effect(() => {
      const jeton = this.demandePanneau.jeton();
      if (jeton !== 0 && jeton !== this.dernierJetonPanneauTraite) {
        this.dernierJetonPanneauTraite = jeton;
        this.canalOuvert.set('general');
        this.chargerNotifications('general');
      }
    });

    // WebSocket (temps réel) : met à jour les trois compteurs immédiatement ; son/animation au
    // même instant si le message porte `nouvelle: true` (signal explicite du serveur).
    effect(() => {
      const message = this.wsAdmin.dernierMessage();
      if (!message) {
        return;
      }
      this.etatsParCanal.restaurant.nonLues.set(message.restaurant);
      this.etatsParCanal.service.nonLues.set(message.service);
      this.etatsParCanal.general.nonLues.set(message.general);
      this.precedent = message;
      if (message.nouvelle) {
        this.declencherNotification();
      }
    });

    // Secours REST (WebSocket coupé, voir ngOnInit) : recale les compteurs à chaque contrôle ;
    // sonne sur une vraie hausse du total OU de l'un des trois canaux (jamais l'inverse, pour ne
    // pas manquer une hausse sur un canal compensée par une lecture sur un autre).
    effect(() => {
      const reponse = this.detecteur.derniereReponse();
      if (!reponse) {
        return;
      }
      const avant = this.precedent;
      this.etatsParCanal.restaurant.nonLues.set(reponse.restaurant);
      this.etatsParCanal.service.nonLues.set(reponse.service);
      this.etatsParCanal.general.nonLues.set(reponse.general);
      this.precedent = reponse;
      const hausse =
        !!avant &&
        (reponse.restaurant > avant.restaurant ||
          reponse.service > avant.service ||
          reponse.general > avant.general ||
          reponse.nb_non_lues > avant.nb_non_lues);
      if (hausse) {
        this.declencherNotification();
      }
    });
  }

  ngOnInit(): void {
    // La connexion et le polling s'arrêtent avec le composant : l'en-tête est détruit à la déconnexion.
    this.wsAdmin.demarrer();
    this.detecteur.demarrer({
      charger: () => this.service.compteur(),
      selectionnerCompteur: (reponse) => reponse.nb_non_lues,
      intervalleMs: INTERVALLE_SECOURS_MS,
      actif: () => this.authService.role() === 'admin' && !this.wsAdmin.connecte(),
      pauseSiOngletMasque: true,
    });
  }

  /** Texte du badge d'une cloche : masqué à 0 (voir le template), « 99+ » au-delà de 99. */
  texteBadge(nbNonLues: number): string {
    return nbNonLues > 99 ? '99+' : String(nbNonLues);
  }

  basculerPanneau(canal: CanalNotificationAdmin): void {
    // Un seul panneau ouvert à la fois : re-cliquer la cloche déjà ouverte la referme.
    const ouverture = this.canalOuvert() !== canal;
    this.canalOuvert.set(ouverture ? canal : null);
    if (ouverture) {
      this.chargerNotifications(canal);
    }
  }

  @HostListener('document:keydown.escape')
  fermerPanneaux(): void {
    this.canalOuvert.set(null);
  }

  private chargerNotifications(canal: CanalNotificationAdmin): void {
    const { chargement, erreur, notifications } = this.etatsParCanal[canal];

    chargement.set(true);
    erreur.set(null);

    this.service.lister(canal, NB_NOTIFICATIONS_AFFICHEES).subscribe({
      next: (reponse) => {
        chargement.set(false);
        notifications.set(reponse.results);
        this.definirCompteurCanal(canal, reponse.nb_non_lues);
      },
      error: (erreur2: unknown) => {
        chargement.set(false);
        erreur.set(extraireMessageErreur(erreur2));
      },
    });
  }

  toutMarquerCommeLu(canal: CanalNotificationAdmin): void {
    const { erreur, notifications } = this.etatsParCanal[canal];

    this.service.toutLire(canal).subscribe({
      next: (reponse) => {
        notifications.update((liste) => liste.map((n) => ({ ...n, lue: true })));
        this.definirCompteurCanal(canal, reponse.nb_non_lues);
      },
      error: (e: unknown) => erreur.set(extraireMessageErreur(e)),
    });
  }

  /**
   * Marque la notification comme lue, ferme les panneaux puis navigue vers l'écran cible
   * (commandes/interventions/demandes de location) ou, pour les campagnes de pub, vers Publicités
   * > Campagnes sur l'onglet de statut correspondant — comportement inchangé pour ce dernier cas.
   */
  ouvrirNotification(notification: NotificationAdmin): void {
    const { notifications, nonLues } = this.etatsParCanal[notification.canal];
    if (!notification.lue) {
      this.service.lire(notification.id).subscribe({
        next: () => {
          notifications.update((liste) =>
            liste.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)),
          );
          this.definirCompteurCanal(notification.canal, Math.max(0, nonLues() - 1));
        },
        error: () => {
          // Non bloquant : la navigation a lieu quand même, le compteur se recalera au prochain polling.
        },
      });
    }

    this.fermerPanneaux();
    this.naviguerVers(notification);
  }

  /**
   * `cible` pilote la navigation quand le backend la fournit ; sinon repli sur le type et les
   * anciens champs plats (commande_id, demande_id, publicite_id…), pour ne jamais rester sans
   * destination si un type de notification ne la peuple pas encore. Chemin/queryParams calculés
   * par destinationEcranAdmin (noyau/notifications), partagée avec le clic sur une notification
   * push (OuvrirNotification / SwPush.notificationClicks), qui ne connaît que ecran+id.
   */
  private naviguerVers(notification: NotificationAdmin): void {
    const cible = notification.cible;
    const ecran = cible?.ecran ?? this.ecranReplisurType(notification.type);
    const id =
      cible?.id ??
      (ecran === 'commandes'
        ? notification.commande_id
        : ecran === 'demandes_location'
          ? notification.demande_id
          : notification.publicite_id);

    const destination = destinationEcranAdmin(ecran, id ?? undefined, {
      canal: notification.canal,
      statutPublicite: STATUT_CAMPAGNE_PAR_TYPE[notification.type],
    });
    this.router.navigate(destination.chemin, { queryParams: destination.queryParams });
  }

  /** Repli quand le backend ne renvoie pas (encore) `cible` pour ce type de notification. */
  private ecranReplisurType(type: TypeNotificationAdmin): EcranCibleNotificationAdmin {
    switch (type) {
      case 'commande_nouvelle':
      case 'commande_annulee_client':
        return 'commandes';
      case 'intervention_nouvelle':
        return 'interventions';
      case 'reservation_nouvelle':
        return 'demandes_location';
      default:
        return 'publicites';
    }
  }

  /**
   * Ajuste un canal localement (lu / tout-lire), sans son (comportement actuel conservé) : le
   * WebSocket confirmera ensuite avec `nouvelle: false`, y compris dans les autres onglets.
   */
  private definirCompteurCanal(canal: CanalNotificationAdmin, valeur: number): void {
    this.etatsParCanal[canal].nonLues.set(valeur);
    const total = this.nbNonLuesRestaurant() + this.nbNonLuesService() + this.nbNonLuesGeneral();
    this.detecteur.definirCompteur(total);
    // Resynchronise `precedent` : sinon le prochain contrôle (secours REST) verrait une hausse
    // illusoire par rapport à une valeur devenue obsolète.
    this.precedent = {
      restaurant: this.nbNonLuesRestaurant(),
      service: this.nbNonLuesService(),
      general: this.nbNonLuesGeneral(),
      nb_non_lues: total,
    };
  }

  private declencherNotification(): void {
    this.enAnimation.set(true);
    setTimeout(() => this.enAnimation.set(false), DUREE_ANIMATION_MS);
    // Push activé et autorisé sur cet appareil : la notification système sonne déjà, pas de double son.
    if (!this.notificationsPush.actifEtAutorise()) {
      this.coordinateurSon.proposerSonner(() => this.son.jouer());
    }
  }
}

import { Component, DestroyRef, HostListener, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { CoordinateurSonAdmin } from '../../../noyau/notifications/coordinateur-son-admin';
import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { NotificationsAdminService } from '../../../noyau/notifications/notifications-admin.service';
import { NotificationsAdminWebSocket } from '../../../noyau/notifications/notifications-admin-websocket';
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

/**
 * Deux cloches de notifications de l'en-tête admin / super-admin, chacune pour son canal : même
 * icône 🔔 pour les deux, jaune pour Restaurants (commandes restaurant), bleue pour Général
 * (campagnes de pub, autres commandes, demandes de location, demandes d'intervention).
 * Compteurs en temps réel via WebSocket (NotificationsAdminWebSocket) : son/animation dès qu'un
 * message porte `nouvelle: true`, au même instant que la mise à jour du chiffre. Secours REST
 * (DetecteurCompteur, GET compteur/) toutes les 60 s tant que le WebSocket est coupé, son sur une
 * hausse du total OU de l'un des deux canaux. Un seul onglet admin — le premier à débloquer son
 * son — sonne en continu, y compris en arrière-plan (élection par navigator.locks, voir
 * CoordinateurSonAdmin) ; les compteurs, eux, se mettent à jour dans tous les onglets. Chaque
 * cloche a son propre panneau, sa propre liste et son propre « Tout marquer comme lu »
 * (POST tout-lire/?canal=). Même son que la cloche partenaire.
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

  private readonly son = new SonNotification(this.destroyRef);
  private readonly coordinateurSon = new CoordinateurSonAdmin(this.destroyRef);

  readonly formaterDateRelative = formaterDateRelative;
  /** Affiche « Activer le son » près des cloches tant que le navigateur bloque la lecture. */
  readonly sonBloque = this.son.bloque;

  readonly enAnimation = signal(false);

  // Dernières valeurs connues (WebSocket ou secours REST), pour détecter une hausse sur CHAQUE
  // canal côté secours REST (qui ne porte pas de `nouvelle` — voir l'effet correspondant).
  private precedent: ReponseCompteurNotificationsAdmin | null = null;

  // Au plus un panneau ouvert à la fois : null = les deux fermés, sinon le canal ouvert.
  readonly canalOuvert = signal<CanalNotificationAdmin | null>(null);
  readonly panneauOuvertRestaurant = computed(() => this.canalOuvert() === 'restaurant');
  readonly panneauOuvertGeneral = computed(() => this.canalOuvert() === 'general');

  // ---- Canal "restaurant" (🍽️) ----
  readonly nbNonLuesRestaurant = signal(0);
  readonly chargementRestaurant = signal(false);
  readonly erreurRestaurant = signal<string | null>(null);
  readonly notificationsRestaurant = signal<NotificationAdmin[]>([]);

  // ---- Canal "general" (🔔) ----
  readonly nbNonLuesGeneral = signal(0);
  readonly chargementGeneral = signal(false);
  readonly erreurGeneral = signal<string | null>(null);
  readonly notificationsGeneral = signal<NotificationAdmin[]>([]);

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

    // WebSocket (temps réel) : met à jour les deux compteurs immédiatement ; son/animation au
    // même instant si le message porte `nouvelle: true` (signal explicite du serveur).
    effect(() => {
      const message = this.wsAdmin.dernierMessage();
      if (!message) {
        return;
      }
      this.nbNonLuesRestaurant.set(message.restaurant);
      this.nbNonLuesGeneral.set(message.general);
      this.precedent = message;
      if (message.nouvelle) {
        this.declencherNotification();
      }
    });

    // Secours REST (WebSocket coupé, voir ngOnInit) : recale les compteurs à chaque contrôle ;
    // sonne sur une vraie hausse du total OU de l'un des deux canaux (jamais l'inverse, pour ne
    // pas manquer une hausse sur un canal compensée par une lecture sur l'autre).
    effect(() => {
      const reponse = this.detecteur.derniereReponse();
      if (!reponse) {
        return;
      }
      const avant = this.precedent;
      this.nbNonLuesRestaurant.set(reponse.restaurant);
      this.nbNonLuesGeneral.set(reponse.general);
      this.precedent = reponse;
      const hausse =
        !!avant &&
        (reponse.restaurant > avant.restaurant ||
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

  /** Débloque la lecture du son (clic sur « Activer le son »). */
  activerSon(): void {
    this.son.debloquer();
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
    const chargement = canal === 'restaurant' ? this.chargementRestaurant : this.chargementGeneral;
    const erreur = canal === 'restaurant' ? this.erreurRestaurant : this.erreurGeneral;
    const notifications = canal === 'restaurant' ? this.notificationsRestaurant : this.notificationsGeneral;

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
    const erreur = canal === 'restaurant' ? this.erreurRestaurant : this.erreurGeneral;
    const notifications = canal === 'restaurant' ? this.notificationsRestaurant : this.notificationsGeneral;

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
    const notifications = notification.canal === 'restaurant' ? this.notificationsRestaurant : this.notificationsGeneral;
    if (!notification.lue) {
      this.service.lire(notification.id).subscribe({
        next: () => {
          notifications.update((liste) =>
            liste.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)),
          );
          const nbActuel = notification.canal === 'restaurant' ? this.nbNonLuesRestaurant() : this.nbNonLuesGeneral();
          this.definirCompteurCanal(notification.canal, Math.max(0, nbActuel - 1));
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
   * destination si un type de notification ne la peuple pas encore.
   */
  private naviguerVers(notification: NotificationAdmin): void {
    const cible = notification.cible;
    const ecran = cible?.ecran ?? this.ecranReplisurType(notification.type);

    if (ecran === 'commandes') {
      this.router.navigate(['/administration/commandes'], {
        queryParams: {
          commande: cible?.id ?? notification.commande_id ?? undefined,
          // Canal restaurant : pré-filtre le centre des commandes sur la catégorie Restaurants
          // (résolue dynamiquement côté CommandesAdmin, l'id de catégorie n'est pas fixe).
          categorie: notification.canal === 'restaurant' ? 'restaurants' : undefined,
        },
      });
      return;
    }
    if (ecran === 'interventions') {
      this.router.navigate(['/administration/interventions'], {
        queryParams: { intervention: cible?.id ?? undefined },
      });
      return;
    }
    if (ecran === 'demandes_location') {
      this.router.navigate(['/administration/demandes-location'], {
        queryParams: { demande: cible?.id ?? notification.demande_id ?? undefined },
      });
      return;
    }
    // Campagnes de publicité : comportement actuel, inchangé (onglet dérivé du type de notification).
    this.router.navigate(['/administration/publicites'], {
      queryParams: {
        statut: STATUT_CAMPAGNE_PAR_TYPE[notification.type],
        pub: cible?.id ?? notification.publicite_id ?? undefined,
      },
    });
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
    if (canal === 'restaurant') {
      this.nbNonLuesRestaurant.set(valeur);
    } else {
      this.nbNonLuesGeneral.set(valeur);
    }
    const total = this.nbNonLuesRestaurant() + this.nbNonLuesGeneral();
    this.detecteur.definirCompteur(total);
    // Resynchronise `precedent` : sinon le prochain contrôle (secours REST) verrait une hausse
    // illusoire par rapport à une valeur devenue obsolète.
    this.precedent = { restaurant: this.nbNonLuesRestaurant(), general: this.nbNonLuesGeneral(), nb_non_lues: total };
  }

  private declencherNotification(): void {
    this.enAnimation.set(true);
    setTimeout(() => this.enAnimation.set(false), DUREE_ANIMATION_MS);
    this.coordinateurSon.proposerSonner(() => this.son.jouer());
  }
}

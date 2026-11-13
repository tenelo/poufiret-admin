import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { ConfigurationService } from '../config/configuration.service';
import { MessageCompteursAdmin } from '../../modeles/notification-admin.model';

const DELAI_INITIAL_MS = 1000;
const DELAI_MAX_MS = 30000;

/**
 * Connexion WebSocket au canal des notifications admin
 * (wss://<hôte de l'API configurée>/ws/notifications/admin/?token=<jeton d'accès courant>) :
 * reçoit {type: 'compteurs', restaurant, general, nb_non_lues, nouvelle} à la connexion puis à
 * chaque changement (voir MessageCompteursAdmin). Reconnexion automatique à délai croissant
 * (plafonné, réinitialisé dès qu'une connexion aboutit) ; chaque tentative relit le jeton d'accès
 * courant, donc une fermeture 4001 (jeton invalide/expiré) se résout dès que le jeton est renouvelé
 * par ailleurs (intercepteur HTTP), sans mécanisme dédié. Fermeture 4003 (pas admin) : arrêt
 * définitif, pas de reconnexion.
 *
 * À fournir via `providers: [NotificationsAdminWebSocket]` sur le composant consommateur (comme
 * DetecteurCompteur) : une connexion par cloche, fermée à la destruction du composant.
 */
@Injectable()
export class NotificationsAdminWebSocket {
  private readonly authService = inject(AuthService);
  private readonly configuration = inject(ConfigurationService);
  private readonly destroyRef = inject(DestroyRef);

  private socket: WebSocket | null = null;
  private delaiActuelMs = DELAI_INITIAL_MS;
  private minuteurReconnexion: ReturnType<typeof setTimeout> | undefined;
  private arreteDefinitivement = false;
  private fermeeParNous = false;
  private demarre = false;

  private readonly connecteInterne = signal(false);
  private readonly dernierMessageInterne = signal<MessageCompteursAdmin | null>(null);

  /** Vrai pendant que la connexion est établie : pilote le secours REST (voir ClocheNotificationsAdmin). */
  readonly connecte = this.connecteInterne.asReadonly();
  /** Dernier message `compteurs` reçu (null tant qu'aucun n'est encore arrivé). */
  readonly dernierMessage = this.dernierMessageInterne.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.arreter());
  }

  /** Démarre la connexion. Sans effet si déjà démarrée (une seule connexion par instance). */
  demarrer(): void {
    if (this.demarre) {
      return;
    }
    this.demarre = true;
    this.tenterConnexion();
  }

  private tenterConnexion(): void {
    if (this.arreteDefinitivement) {
      return;
    }
    const jeton = this.authService.jetonAcces;
    if (!jeton) {
      this.planifierReconnexion();
      return;
    }

    const socket = new WebSocket(this.urlWebSocket(jeton));
    this.socket = socket;
    this.fermeeParNous = false;

    socket.addEventListener('open', () => {
      this.delaiActuelMs = DELAI_INITIAL_MS;
      this.connecteInterne.set(true);
    });

    socket.addEventListener('message', (evenement: MessageEvent<string>) => {
      let donnees: MessageCompteursAdmin | null = null;
      try {
        donnees = JSON.parse(evenement.data) as MessageCompteursAdmin;
      } catch {
        return; // Message illisible : ignoré, sans impact sur la connexion ni les prochains messages.
      }
      if (donnees?.type === 'compteurs') {
        this.dernierMessageInterne.set(donnees);
      }
    });

    socket.addEventListener('close', (evenement: CloseEvent) => {
      this.socket = null;
      this.connecteInterne.set(false);
      if (this.fermeeParNous) {
        return;
      }
      if (evenement.code === 4003) {
        this.arreteDefinitivement = true;
        return;
      }
      // 4001 (jeton invalide/expiré) ou toute autre coupure : reconnecte à délai croissant, en
      // relisant le jeton d'accès courant à chaque tentative (voir tenterConnexion ci-dessus).
      this.planifierReconnexion();
    });
  }

  private planifierReconnexion(): void {
    clearTimeout(this.minuteurReconnexion);
    this.minuteurReconnexion = setTimeout(() => this.tenterConnexion(), this.delaiActuelMs);
    this.delaiActuelMs = Math.min(this.delaiActuelMs * 2, DELAI_MAX_MS);
  }

  private urlWebSocket(jeton: string): string {
    const url = new URL(this.configuration.apiUrl);
    const protocole = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocole}//${url.host}/ws/notifications/admin/?token=${encodeURIComponent(jeton)}`;
  }

  private arreter(): void {
    this.arreteDefinitivement = true;
    clearTimeout(this.minuteurReconnexion);
    if (this.socket) {
      this.fermeeParNous = true;
      this.socket.close();
      this.socket = null;
    }
  }
}

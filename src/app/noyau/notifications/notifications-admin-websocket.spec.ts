import { TestBed } from '@angular/core/testing';

import { NotificationsAdminWebSocket } from './notifications-admin-websocket';
import { AuthService } from '../auth/auth.service';
import { ConfigurationService } from '../config/configuration.service';

const API_URL = 'https://api.test/api/v1';

type Ecouteur = (evenement: { data?: string; code?: number }) => void;

/** Simule window.WebSocket : jamais de vraie connexion réseau dans les tests. */
class WebSocketSimule {
  static instances: WebSocketSimule[] = [];
  readonly url: string;
  private readonly ecouteurs: Record<string, Ecouteur[]> = {};

  constructor(url: string) {
    this.url = url;
    WebSocketSimule.instances.push(this);
  }

  addEventListener(type: string, callback: Ecouteur): void {
    (this.ecouteurs[type] ??= []).push(callback);
  }

  removeEventListener(): void {
    // Non utilisé par le service (pas de removeEventListener côté NotificationsAdminWebSocket).
  }

  close(): void {
    this.emettre('close', { code: 1000 });
  }

  emettre(type: string, detail: { data?: string; code?: number } = {}): void {
    for (const callback of this.ecouteurs[type] ?? []) callback(detail);
  }
}

describe('NotificationsAdminWebSocket', () => {
  let originalWebSocket: typeof WebSocket;
  let jetonActuel: string | null;

  function creer(): NotificationsAdminWebSocket {
    jetonActuel = 'jeton-1';
    WebSocketSimule.instances = [];

    TestBed.configureTestingModule({
      providers: [
        NotificationsAdminWebSocket,
        { provide: AuthService, useValue: { get jetonAcces(): string | null { return jetonActuel; } } },
        { provide: ConfigurationService, useValue: { apiUrl: API_URL, production: false } },
      ],
    });
    return TestBed.inject(NotificationsAdminWebSocket);
  }

  beforeEach(() => {
    originalWebSocket = (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocketSimule;
    jasmine.clock().install();
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
    jasmine.clock().uninstall();
  });

  it("se connecte à l'hôte dérivé de l'API, avec le jeton courant", () => {
    const service = creer();
    service.demarrer();

    expect(WebSocketSimule.instances.length).toBe(1);
    expect(WebSocketSimule.instances[0].url).toBe('wss://api.test/ws/notifications/admin/?token=jeton-1');
  });

  it('met à jour dernierMessage à la réception, et connecte à l’ouverture', () => {
    const service = creer();
    service.demarrer();
    const socket = WebSocketSimule.instances[0];

    socket.emettre('open');
    expect(service.connecte()).toBeTrue();

    socket.emettre('message', {
      data: JSON.stringify({ type: 'compteurs', restaurant: 2, general: 5, nb_non_lues: 7, nouvelle: true }),
    });
    expect(service.dernierMessage()).toEqual({
      type: 'compteurs',
      restaurant: 2,
      general: 5,
      nb_non_lues: 7,
      nouvelle: true,
    });
  });

  it('reconnecte à délai croissant après une coupure (hors 4003)', () => {
    const service = creer();
    service.demarrer();
    WebSocketSimule.instances[0].emettre('close', { code: 1006 });
    expect(service.connecte()).toBeFalse();

    // Délai initial (1 s) : pas encore écoulé.
    jasmine.clock().tick(999);
    expect(WebSocketSimule.instances.length).toBe(1);

    jasmine.clock().tick(2);
    expect(WebSocketSimule.instances.length).toBe(2);

    // Nouvelle coupure : le délai a doublé (2 s).
    WebSocketSimule.instances[1].emettre('close', { code: 1006 });
    jasmine.clock().tick(1999);
    expect(WebSocketSimule.instances.length).toBe(2);
    jasmine.clock().tick(2);
    expect(WebSocketSimule.instances.length).toBe(3);
  });

  it('reconnecte avec le jeton courant (renouvelé entre-temps)', () => {
    const service = creer();
    service.demarrer();
    WebSocketSimule.instances[0].emettre('close', { code: 4001 });

    jetonActuel = 'jeton-renouvele';
    jasmine.clock().tick(1000);

    expect(WebSocketSimule.instances.length).toBe(2);
    expect(WebSocketSimule.instances[1].url).toContain('token=jeton-renouvele');
  });

  it('ne reconnecte jamais après une fermeture 4003 (pas admin)', () => {
    const service = creer();
    service.demarrer();
    WebSocketSimule.instances[0].emettre('close', { code: 4003 });

    jasmine.clock().tick(60000);
    expect(WebSocketSimule.instances.length).toBe(1);
  });
});

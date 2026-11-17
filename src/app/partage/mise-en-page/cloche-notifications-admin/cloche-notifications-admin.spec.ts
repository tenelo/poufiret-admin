import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ClocheNotificationsAdmin } from './cloche-notifications-admin';
import { AuthService } from '../../../noyau/auth/auth.service';
import { DemandePanneauNotificationsService } from '../../../noyau/notifications/demande-panneau-notifications.service';
import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { NotificationsAdminService } from '../../../noyau/notifications/notifications-admin.service';
import { NotificationsAdminWebSocket } from '../../../noyau/notifications/notifications-admin-websocket';
import { NotificationsPushEtatService } from '../../../noyau/notifications/notifications-push-etat.service';
import { MessageCompteursAdmin, ReponseCompteurNotificationsAdmin } from '../../../modeles/notification-admin.model';

interface OptionsDetecteurCapturees {
  intervalleMs: number;
  actif?: () => boolean;
}

describe('ClocheNotificationsAdmin', () => {
  let dernierMessage: ReturnType<typeof signal<MessageCompteursAdmin | null>>;
  let connecte: ReturnType<typeof signal<boolean>>;
  let derniereReponse: ReturnType<typeof signal<ReponseCompteurNotificationsAdmin | null>>;
  let optionsDetecteur: OptionsDetecteurCapturees | null;
  let wsFaux: { dernierMessage: typeof dernierMessage; connecte: typeof connecte; demarrer: jasmine.Spy };
  let notificationsPushFaux: ReturnType<typeof creerNotificationsPushFaux>;
  let fixture: ComponentFixture<ClocheNotificationsAdmin>;
  let component: ClocheNotificationsAdmin;

  /** Fake minimal couvrant tout ce que lit le template de EtatNotificationsPush (imbriqué dans la cloche). */
  function creerNotificationsPushFaux() {
    return {
      support: signal<'supporte' | 'ios_non_installe' | 'non_supporte'>('non_supporte'),
      permission: signal<'activee' | 'bloquee' | 'en_attente'>('en_attente'),
      actifEtAutorise: signal(false),
      enCours: signal(false),
      messageErreur: signal<string | null>(null),
      messageSucces: signal<string | null>(null),
      activer: () => undefined,
      desactiverSurCetAppareil: () => undefined,
      envoyerTest: () => undefined,
    };
  }

  async function creer(): Promise<void> {
    dernierMessage = signal<MessageCompteursAdmin | null>(null);
    connecte = signal(false);
    derniereReponse = signal<ReponseCompteurNotificationsAdmin | null>(null);
    optionsDetecteur = null;
    notificationsPushFaux = creerNotificationsPushFaux();

    const detecteurFaux = {
      derniereReponse,
      demarrer: (options: OptionsDetecteurCapturees) => {
        optionsDetecteur = options;
      },
      definirCompteur: () => undefined,
    };
    wsFaux = {
      dernierMessage,
      connecte,
      demarrer: jasmine.createSpy('demarrer'),
    };

    await TestBed.configureTestingModule({
      imports: [ClocheNotificationsAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { role: () => 'admin' } },
        {
          provide: NotificationsAdminService,
          useValue: {
            compteur: () => of({ restaurant: 0, service: 0, general: 0, nb_non_lues: 0 }),
            lister: () => of({ results: [], nb_non_lues: 0 }),
          },
        },
        // Gating du double son (voir declencherNotification) : fake minimal, pas besoin de SwPush
        // réel (provideServiceWorker) puisque le composant n'injecte jamais SwPush directement.
        { provide: NotificationsPushEtatService, useValue: notificationsPushFaux },
      ],
    })
      .overrideComponent(ClocheNotificationsAdmin, {
        set: {
          providers: [
            { provide: DetecteurCompteur, useValue: detecteurFaux },
            { provide: NotificationsAdminWebSocket, useValue: wsFaux },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClocheNotificationsAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('démarre la connexion WebSocket et le secours REST (60 s, actif seulement si le WS est coupé)', async () => {
    await creer();

    expect(wsFaux.demarrer).toHaveBeenCalled();
    expect(optionsDetecteur?.intervalleMs).toBe(60000);

    connecte.set(false);
    expect(optionsDetecteur?.actif?.()).toBeTrue();
    connecte.set(true);
    expect(optionsDetecteur?.actif?.()).toBeFalse();
  });

  it('met à jour les trois compteurs dès la réception d’un message WebSocket', async () => {
    await creer();

    dernierMessage.set({ type: 'compteurs', restaurant: 3, service: 2, general: 4, nb_non_lues: 9, nouvelle: false });
    fixture.detectChanges();

    expect(component.nbNonLuesRestaurant()).toBe(3);
    expect(component.nbNonLuesService()).toBe(2);
    expect(component.nbNonLuesGeneral()).toBe(4);
  });

  it('sonne seulement quand le message porte nouvelle: true', async () => {
    await creer();
    const declencher = spyOn<any>(component, 'declencherNotification').and.callThrough();

    dernierMessage.set({ type: 'compteurs', restaurant: 1, service: 0, general: 0, nb_non_lues: 1, nouvelle: false });
    fixture.detectChanges();
    expect(declencher).not.toHaveBeenCalled();

    dernierMessage.set({ type: 'compteurs', restaurant: 2, service: 0, general: 0, nb_non_lues: 2, nouvelle: true });
    fixture.detectChanges();
    expect(declencher).toHaveBeenCalledTimes(1);
  });

  it('secours REST : sonne sur une hausse d’UN SEUL des trois canaux même si le total ne bouge pas', async () => {
    await creer();
    const declencher = spyOn<any>(component, 'declencherNotification').and.callThrough();

    derniereReponse.set({ restaurant: 2, service: 1, general: 5, nb_non_lues: 8 });
    fixture.detectChanges();
    expect(declencher).not.toHaveBeenCalled(); // 1er relevé : pas de référence antérieure.

    // Service +1, général -1 : le total reste à 8, mais une notification Services est bien arrivée.
    derniereReponse.set({ restaurant: 2, service: 2, general: 4, nb_non_lues: 8 });
    fixture.detectChanges();
    expect(declencher).toHaveBeenCalledTimes(1);
  });

  it('affiche « Activer le son » dans le menu de réglages tant que la lecture est bloquée (par défaut, avant tout déblocage), et appelle debloquer() au clic', async () => {
    await creer();

    // bloque = audioContext.state !== 'running' : vrai par défaut, aucun contexte n'existe encore
    // -> le bouton de réglages (MenuReglagesNotifications) est donc visible dès le départ.
    const boutonReglages = fixture.nativeElement.querySelector('.bouton-reglages') as HTMLButtonElement;
    expect(boutonReglages).not.toBeNull();
    boutonReglages.click();
    fixture.detectChanges();

    const bouton = fixture.nativeElement.querySelector('.bouton-activer-son') as HTMLButtonElement;
    expect(bouton).not.toBeNull();

    const debloquer = spyOn<any>((component as any).son, 'debloquer');
    bouton.click();
    expect(debloquer).toHaveBeenCalled();
  });

  it('masque « Activer le son » dans le menu une fois la lecture débloquée (bloqueInterne à jour)', async () => {
    await creer();
    (fixture.nativeElement.querySelector('.bouton-reglages') as HTMLButtonElement).click();
    fixture.detectChanges();

    // bloqueInterne est privé côté TypeScript seulement : accessible à l'exécution, comme Angular
    // le permet depuis un template (sonBloque = son.bloque est la même vue en lecture seule).
    const bloqueInterne = (component as any).son.bloqueInterne as ReturnType<typeof signal<boolean>>;
    bloqueInterne.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bouton-activer-son')).toBeNull();
  });

  it('ne sonne pas si le push est activé et autorisé sur cet appareil (évite le double son)', async () => {
    await creer();
    notificationsPushFaux.actifEtAutorise.set(true);
    const proposerSonner = spyOn<any>((component as any).coordinateurSon, 'proposerSonner');

    dernierMessage.set({ type: 'compteurs', restaurant: 1, service: 0, general: 0, nb_non_lues: 1, nouvelle: true });
    fixture.detectChanges();

    expect(proposerSonner).not.toHaveBeenCalled();
  });

  it('sonne normalement si le push n’est pas activé sur cet appareil (comportement actuel)', async () => {
    await creer();
    const proposerSonner = spyOn<any>((component as any).coordinateurSon, 'proposerSonner');

    dernierMessage.set({ type: 'compteurs', restaurant: 1, service: 0, general: 0, nb_non_lues: 1, nouvelle: true });
    fixture.detectChanges();

    expect(proposerSonner).toHaveBeenCalled();
  });

  it('ouvre le panneau général quand une notification push sans écran cible le demande', async () => {
    await creer();
    const demandePanneau = TestBed.inject(DemandePanneauNotificationsService);

    demandePanneau.demander();
    fixture.detectChanges();

    expect(component.canalOuvert()).toBe('general');
  });

  it('bascule bien sur le panneau "service" (troisième cloche)', async () => {
    await creer();
    component.basculerPanneau('service');
    fixture.detectChanges();

    expect(component.panneauOuvertService()).toBeTrue();
    expect(component.panneauOuvertRestaurant()).toBeFalse();
    expect(component.panneauOuvertGeneral()).toBeFalse();
  });
});

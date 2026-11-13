import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ClocheNotificationsAdmin } from './cloche-notifications-admin';
import { AuthService } from '../../../noyau/auth/auth.service';
import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { NotificationsAdminService } from '../../../noyau/notifications/notifications-admin.service';
import { NotificationsAdminWebSocket } from '../../../noyau/notifications/notifications-admin-websocket';
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
  let fixture: ComponentFixture<ClocheNotificationsAdmin>;
  let component: ClocheNotificationsAdmin;

  async function creer(): Promise<void> {
    dernierMessage = signal<MessageCompteursAdmin | null>(null);
    connecte = signal(false);
    derniereReponse = signal<ReponseCompteurNotificationsAdmin | null>(null);
    optionsDetecteur = null;

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
        { provide: NotificationsAdminService, useValue: { compteur: () => of({ restaurant: 0, general: 0, nb_non_lues: 0 }) } },
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

  it('met à jour les deux compteurs dès la réception d’un message WebSocket', async () => {
    await creer();

    dernierMessage.set({ type: 'compteurs', restaurant: 3, general: 4, nb_non_lues: 7, nouvelle: false });
    fixture.detectChanges();

    expect(component.nbNonLuesRestaurant()).toBe(3);
    expect(component.nbNonLuesGeneral()).toBe(4);
  });

  it('sonne seulement quand le message porte nouvelle: true', async () => {
    await creer();
    const declencher = spyOn<any>(component, 'declencherNotification').and.callThrough();

    dernierMessage.set({ type: 'compteurs', restaurant: 1, general: 0, nb_non_lues: 1, nouvelle: false });
    fixture.detectChanges();
    expect(declencher).not.toHaveBeenCalled();

    dernierMessage.set({ type: 'compteurs', restaurant: 2, general: 0, nb_non_lues: 2, nouvelle: true });
    fixture.detectChanges();
    expect(declencher).toHaveBeenCalledTimes(1);
  });

  it('secours REST : sonne sur une hausse d’UN SEUL des deux canaux même si le total ne bouge pas', async () => {
    await creer();
    const declencher = spyOn<any>(component, 'declencherNotification').and.callThrough();

    derniereReponse.set({ restaurant: 2, general: 5, nb_non_lues: 7 });
    fixture.detectChanges();
    expect(declencher).not.toHaveBeenCalled(); // 1er relevé : pas de référence antérieure.

    // Restaurant +1, général -1 : le total reste à 7, mais une notification restaurant est bien arrivée.
    derniereReponse.set({ restaurant: 3, general: 4, nb_non_lues: 7 });
    fixture.detectChanges();
    expect(declencher).toHaveBeenCalledTimes(1);
  });

  it('affiche « Activer le son » seulement quand la lecture est bloquée, et appelle debloquer() au clic', async () => {
    await creer();

    expect(fixture.nativeElement.querySelector('.bouton-activer-son')).toBeNull();

    // bloqueInterne est privé côté TypeScript seulement : accessible à l'exécution, comme Angular
    // le permet depuis un template (sonBloque = son.bloque est la même vue en lecture seule).
    const bloqueInterne = (component as any).son.bloqueInterne as ReturnType<typeof signal<boolean>>;
    bloqueInterne.set(true);
    fixture.detectChanges();

    const bouton = fixture.nativeElement.querySelector('.bouton-activer-son') as HTMLButtonElement;
    expect(bouton).not.toBeNull();

    const debloquer = spyOn<any>((component as any).son, 'debloquer');
    bouton.click();
    expect(debloquer).toHaveBeenCalled();
  });
});

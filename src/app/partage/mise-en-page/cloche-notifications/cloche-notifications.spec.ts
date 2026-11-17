import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ClocheNotifications } from './cloche-notifications';
import { AuthService } from '../../../noyau/auth/auth.service';
import { DemandePanneauNotificationsService } from '../../../noyau/notifications/demande-panneau-notifications.service';
import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { NotificationsPushEtatService } from '../../../noyau/notifications/notifications-push-etat.service';
import { MesCommandesService } from '../../../fonctionnalites/partenaire/mes-commandes/mes-commandes.service';

/**
 * Gating du double son (point 7 : push activé et autorisé sur cet appareil => pas de son Web
 * Audio en plus) et ouverture du panneau sur demande (clic sur une notification push sans écran
 * cible exploitable — voir naviguer-depuis-notification.ts).
 */
describe('ClocheNotifications (partenaire)', () => {
  let notificationsPushFaux: ReturnType<typeof creerNotificationsPushFaux>;
  let detecteurFaux: { aAugmente: ReturnType<typeof signal<boolean>>; compteur: ReturnType<typeof signal<number>>; derniereReponse: ReturnType<typeof signal<unknown>>; demarrer: jasmine.Spy; accuserAugmentation: jasmine.Spy };
  let fixture: ComponentFixture<ClocheNotifications>;
  let component: ClocheNotifications;

  /** Fake minimal : seul actifEtAutorise() est lu par ce composant (gating du double son, voir
   *  declencherNotification) — EtatNotificationsPush ne vit plus que dans Mon profil. */
  function creerNotificationsPushFaux() {
    return { actifEtAutorise: signal(false) };
  }

  async function creer(): Promise<void> {
    notificationsPushFaux = creerNotificationsPushFaux();
    detecteurFaux = {
      aAugmente: signal(false),
      compteur: signal(0),
      derniereReponse: signal(null),
      demarrer: jasmine.createSpy('demarrer'),
      accuserAugmentation: jasmine.createSpy('accuserAugmentation'),
    };

    await TestBed.configureTestingModule({
      imports: [ClocheNotifications],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { role: () => 'partenaire' } },
        { provide: MesCommandesService, useValue: { resume: () => of({ nouvelles: 0, acceptees: 0, en_preparation: 0 }) } },
        { provide: NotificationsPushEtatService, useValue: notificationsPushFaux },
      ],
    })
      .overrideComponent(ClocheNotifications, { set: { providers: [{ provide: DetecteurCompteur, useValue: detecteurFaux }] } })
      .compileComponents();

    fixture = TestBed.createComponent(ClocheNotifications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('ne sonne pas si le push est activé et autorisé sur cet appareil (évite le double son)', async () => {
    await creer();
    notificationsPushFaux.actifEtAutorise.set(true);
    const jouer = spyOn<any>((component as any).son, 'jouer');

    detecteurFaux.aAugmente.set(true);
    fixture.detectChanges();

    expect(jouer).not.toHaveBeenCalled();
    expect(detecteurFaux.accuserAugmentation).toHaveBeenCalled();
  });

  it('sonne normalement si le push n’est pas activé sur cet appareil (comportement actuel)', async () => {
    await creer();
    const jouer = spyOn<any>((component as any).son, 'jouer');

    detecteurFaux.aAugmente.set(true);
    fixture.detectChanges();

    expect(jouer).toHaveBeenCalled();
  });

  it("n'affiche aucun réglage Web Push dans le panneau Commandes (vit uniquement dans Mon profil)", async () => {
    await creer();
    component.basculerPanneau();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-etat-notifications-push')).toBeNull();
    expect(fixture.nativeElement.querySelector('.bouton-activer-son')).toBeNull();
  });

  it('ouvre le panneau quand une notification push sans écran cible le demande', async () => {
    await creer();
    const demandePanneau = TestBed.inject(DemandePanneauNotificationsService);

    expect(component.panneauOuvert()).toBeFalse();
    demandePanneau.demander();
    fixture.detectChanges();

    expect(component.panneauOuvert()).toBeTrue();
  });
});

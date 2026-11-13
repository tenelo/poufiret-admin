import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { MiseAJourService, RECHARGER_PAGE } from './mise-a-jour.service';

describe('MiseAJourService', () => {
  let versionUpdates$: Subject<VersionEvent>;
  let unrecoverable$: Subject<UnrecoverableStateEvent>;
  let checkForUpdate: jasmine.Spy;
  let activateUpdate: jasmine.Spy;
  let rechargerPage: jasmine.Spy;

  function creer(isEnabled: boolean): MiseAJourService {
    versionUpdates$ = new Subject<VersionEvent>();
    unrecoverable$ = new Subject<UnrecoverableStateEvent>();
    checkForUpdate = jasmine.createSpy('checkForUpdate').and.resolveTo(false);
    activateUpdate = jasmine.createSpy('activateUpdate').and.resolveTo(true);
    // Location.prototype.reload n'est pas substituable par spyOn : on passe par le jeton
    // RECHARGER_PAGE (voir mise-a-jour.service.ts).
    rechargerPage = jasmine.createSpy('rechargerPage');

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled,
            versionUpdates: versionUpdates$.asObservable(),
            unrecoverable: unrecoverable$.asObservable(),
            checkForUpdate,
            activateUpdate,
          },
        },
        { provide: RECHARGER_PAGE, useValue: rechargerPage },
      ],
    });
    return TestBed.inject(MiseAJourService);
  }

  it("ne vérifie rien et n'affiche rien quand le service worker est désactivé (mode développement)", () => {
    const service = creer(false);
    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(service.miseAJourDisponible()).toBeFalse();

    versionUpdates$.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    expect(service.miseAJourDisponible()).toBeFalse();
  });

  it('vérifie une mise à jour dès la création (démarrage)', () => {
    creer(true);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('affiche le bandeau sur VERSION_READY', () => {
    const service = creer(true);
    expect(service.miseAJourDisponible()).toBeFalse();

    versionUpdates$.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    expect(service.miseAJourDisponible()).toBeTrue();
  });

  it("n'affiche rien de visible sur VERSION_INSTALLATION_FAILED", () => {
    const service = creer(true);
    versionUpdates$.next({ type: 'VERSION_INSTALLATION_FAILED', version: { hash: 'a' }, error: 'boom' });
    expect(service.miseAJourDisponible()).toBeFalse();
  });

  it('recharge directement la page sur un état irrécupérable', () => {
    creer(true);
    unrecoverable$.next({ type: 'UNRECOVERABLE_STATE', reason: 'hash manquant' });
    expect(rechargerPage).toHaveBeenCalled();
  });

  it('activer() appelle activateUpdate puis recharge la page', async () => {
    const service = creer(true);

    service.activer();
    expect(activateUpdate).toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();
    expect(rechargerPage).toHaveBeenCalled();
  });

  it("ignorer() masque le bandeau, qui réapparaît au contrôle suivant (retour sur l'onglet)", () => {
    const service = creer(true);
    versionUpdates$.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    expect(service.miseAJourDisponible()).toBeTrue();

    service.ignorer();
    expect(service.miseAJourDisponible()).toBeFalse();

    document.dispatchEvent(new Event('visibilitychange'));
    expect(service.miseAJourDisponible()).toBeTrue();
  });
});

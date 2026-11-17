import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { DemandePanneauNotificationsService } from './demande-panneau-notifications.service';
import {
  ATTENDRE_ABONNEMENT_PUSH_INITIAL,
  LIRE_PERMISSION_NOTIFICATION,
  NotificationsPushEtatService,
} from './notifications-push-etat.service';
import { NotificationsPushService } from './notifications-push.service';

/** PushSubscription minimale (seul .toJSON() est utilisé par le service). */
function abonnementFaux(endpoint = 'https://push.test/abc') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: 'p', auth: 'a' } }),
  } as unknown as PushSubscription;
}

describe('NotificationsPushEtatService', () => {
  let subscription$: Subject<PushSubscription | null>;
  let notificationClicks$: Subject<{ action: string; notification: NotificationOptions & { title: string } }>;
  let swPushFaux: {
    isEnabled: boolean;
    subscription: Subject<PushSubscription | null>;
    notificationClicks: Subject<{ action: string; notification: NotificationOptions & { title: string } }>;
    requestSubscription: jasmine.Spy;
    unsubscribe: jasmine.Spy;
  };
  let serviceFaux: {
    clePublique: jasmine.Spy;
    enregistrerAbonnement: jasmine.Spy;
    supprimerAbonnement: jasmine.Spy;
    envoyerTest: jasmine.Spy;
  };
  let router: jasmine.SpyObj<Router>;
  // 'default' tant qu'un test ne le change pas explicitement AVANT d'appeler creer() : creer() ne
  // doit jamais l'écraser lui-même, sous peine d'effacer la valeur voulue par l'appelant.
  let permissionActuelle: NotificationPermission;
  // Idem : lu par creer() au lieu d'un `isEnabled: true` en dur, pour pouvoir tester le cas
  // "SwPush désactivé" sans que creer() ne l'écrase.
  let swPushActiveInitialement: boolean;
  // Idem : résolution de l'état initial de l'abonnement (voir ATTENDRE_ABONNEMENT_PUSH_INITIAL /
  // `prete`) — par défaut immédiate, pour ne pas ralentir les tests qui ne s'y intéressent pas.
  let attendreAbonnementInitial: () => Promise<unknown>;

  beforeEach(() => {
    permissionActuelle = 'default';
    swPushActiveInitialement = true;
    attendreAbonnementInitial = () => Promise.resolve(null);
    // navigator.permissions.query est un vrai appel navigateur (hors contrôle du test) : neutralisé
    // pour éviter qu'une résolution asynchrone imprévisible ne pollue un test voisin (Chrome
    // Headless, utilisé par la suite, le supporte toujours).
    spyOn(navigator.permissions, 'query').and.returnValue(Promise.reject(new Error('non disponible (test)')));
  });

  function creer(): NotificationsPushEtatService {
    subscription$ = new Subject<PushSubscription | null>();
    notificationClicks$ = new Subject();
    swPushFaux = {
      isEnabled: swPushActiveInitialement,
      subscription: subscription$,
      notificationClicks: notificationClicks$,
      requestSubscription: jasmine.createSpy('requestSubscription'),
      unsubscribe: jasmine.createSpy('unsubscribe').and.returnValue(Promise.resolve()),
    };
    serviceFaux = {
      clePublique: jasmine.createSpy('clePublique').and.returnValue(of({ cle_publique: 'vapid-key' })),
      enregistrerAbonnement: jasmine.createSpy('enregistrerAbonnement').and.returnValue(of(undefined)),
      supprimerAbonnement: jasmine.createSpy('supprimerAbonnement').and.returnValue(of(undefined)),
      envoyerTest: jasmine.createSpy('envoyerTest').and.returnValue(of(undefined)),
    };
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: SwPush, useValue: swPushFaux },
        { provide: NotificationsPushService, useValue: serviceFaux },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: { role: () => 'admin' } },
        { provide: LIRE_PERMISSION_NOTIFICATION, useValue: () => permissionActuelle },
        { provide: ATTENDRE_ABONNEMENT_PUSH_INITIAL, useValue: () => attendreAbonnementInitial() },
        DemandePanneauNotificationsService,
      ],
    });
    const etat = TestBed.inject(NotificationsPushEtatService);
    // subscription$ est un Subject (pas de valeur initiale synchrone) : émet « aucun abonnement »
    // tout de suite après l'injection, comme le ferait SwPush.subscription au premier chargement.
    subscription$.next(null);
    return etat;
  }

  it('support = "supporte" seulement si SwPush est actif (service worker enregistré)', () => {
    const etat = creer();
    expect(etat.support()).toBe('supporte');
  });

  it('support = "non_supporte" si SwPush est désactivé (hors iOS)', () => {
    const etat = creer();
    swPushFaux.isEnabled = false;
    expect(etat.support()).toBe('non_supporte');
  });

  it('abonneSurCetAppareil suit SwPush.subscription', () => {
    const etat = creer();
    expect(etat.abonneSurCetAppareil()).toBeFalse();

    subscription$.next(abonnementFaux());
    expect(etat.abonneSurCetAppareil()).toBeTrue();
  });

  it('actifEtAutorise : vrai seulement si abonné sur cet appareil ET permission accordée', () => {
    permissionActuelle = 'granted';
    const etat = creer();

    expect(etat.actifEtAutorise()).toBeFalse(); // permission accordée, mais pas encore abonné sur CET appareil.
    subscription$.next(abonnementFaux());
    expect(etat.actifEtAutorise()).toBeTrue();
  });

  it('actifEtAutorise : faux si abonné mais la permission est bloquée ou en attente', () => {
    permissionActuelle = 'denied';
    const etat = creer();
    subscription$.next(abonnementFaux());
    expect(etat.actifEtAutorise()).toBeFalse();
  });

  it('activer() : clé publique -> abonnement SwPush -> enregistrement backend, puis message de succès', fakeAsync(() => {
    const etat = creer();
    permissionActuelle = 'granted';
    swPushFaux.requestSubscription.and.returnValue(Promise.resolve(abonnementFaux()));

    etat.activer();
    tick();

    expect(serviceFaux.clePublique).toHaveBeenCalled();
    expect(swPushFaux.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: 'vapid-key' });
    expect(serviceFaux.enregistrerAbonnement).toHaveBeenCalledWith({
      endpoint: 'https://push.test/abc',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
    });
    expect(etat.messageSucces()).toBe('Notifications activées sur cet appareil.');
    expect(etat.enCours()).toBeFalse();
    expect(etat.permission()).toBe('activee');
  }));

  it('activer() : erreur réseau sur la clé publique -> message d’erreur, pas d’abonnement tenté', () => {
    const etat = creer();
    serviceFaux.clePublique.and.returnValue(throwError(() => new Error('hors service')));

    etat.activer();

    expect(swPushFaux.requestSubscription).not.toHaveBeenCalled();
    expect(etat.messageErreur()).toBeTruthy();
    expect(etat.enCours()).toBeFalse();
  });

  it('activer() : refus du navigateur (requestSubscription rejeté) -> pas d’abonnement backend', fakeAsync(() => {
    const etat = creer();
    permissionActuelle = 'denied';
    swPushFaux.requestSubscription.and.returnValue(Promise.reject(new Error('refusé')));

    etat.activer();
    tick();

    expect(serviceFaux.enregistrerAbonnement).not.toHaveBeenCalled();
    expect(etat.enCours()).toBeFalse();
    expect(etat.permission()).toBe('bloquee');
  }));

  it('desactiverSurCetAppareil() : supprime l’abonnement côté backend puis se désabonne localement', fakeAsync(() => {
    const etat = creer();
    subscription$.next(abonnementFaux());

    etat.desactiverSurCetAppareil();

    expect(serviceFaux.supprimerAbonnement).toHaveBeenCalledWith({
      endpoint: 'https://push.test/abc',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
    });
    tick();
    expect(swPushFaux.unsubscribe).toHaveBeenCalled();
    expect(etat.messageSucces()).toBe('Notifications désactivées sur cet appareil.');
  }));

  it('desactiverSurCetAppareil() : sans abonnement actif, ne fait rien', () => {
    const etat = creer();
    etat.desactiverSurCetAppareil();
    expect(serviceFaux.supprimerAbonnement).not.toHaveBeenCalled();
    expect(swPushFaux.unsubscribe).not.toHaveBeenCalled();
  });

  it('envoyerTest() : ignoré si cet appareil n’est pas abonné et autorisé', () => {
    const etat = creer();
    etat.envoyerTest();
    expect(serviceFaux.envoyerTest).not.toHaveBeenCalled();
  });

  it('envoyerTest() : envoie bien la requête une fois abonné et autorisé', fakeAsync(() => {
    permissionActuelle = 'granted';
    const etat = creer();
    swPushFaux.requestSubscription.and.returnValue(Promise.resolve(abonnementFaux()));
    etat.activer(); // abonne + permission 'activee' -> actifEtAutorise() devient vrai
    tick();
    // SwPush met lui-même à jour .subscription après un requestSubscription() réussi (simulé ici,
    // le fake ne lie pas les deux comme le ferait le vrai SwPush).
    subscription$.next(abonnementFaux());

    etat.envoyerTest();

    expect(serviceFaux.envoyerTest).toHaveBeenCalled();
    expect(etat.messageSucces()).toBe('Notification de test envoyée.');
  }));

  it('prete() : faux tant que l’état réel de l’abonnement n’est pas connu, vrai dès qu’il l’est', fakeAsync(() => {
    let resoudre!: (valeur: unknown) => void;
    attendreAbonnementInitial = () => new Promise((resolve) => (resoudre = resolve));
    const etat = creer();

    expect(etat.prete()).toBeFalse();

    resoudre(null);
    tick();
    expect(etat.prete()).toBeTrue();
  }));

  it('prete() : devient vrai après le délai maximum (~5 s) même si l’état initial ne répond jamais', fakeAsync(() => {
    attendreAbonnementInitial = () => new Promise(() => undefined); // ne se résout jamais.
    const etat = creer();

    expect(etat.prete()).toBeFalse();
    tick(4999);
    expect(etat.prete()).toBeFalse();
    tick(1);
    expect(etat.prete()).toBeTrue();
  }));

  it('prete() : déjà vrai dès la création si SwPush est désactivé (rien à attendre)', () => {
    swPushActiveInitialement = false;
    attendreAbonnementInitial = () => new Promise(() => undefined); // jamais appelé dans ce cas.
    const etat = creer();

    expect(etat.prete()).toBeTrue();
  });

  it('clic sur une notification (app déjà ouverte) : navigue avec la même logique que /notifications/ouvrir', () => {
    creer();
    notificationClicks$.next({
      action: '',
      notification: {
        title: 'Nouvelle commande',
        data: { onActionClick: { default: { url: '/notifications/ouvrir?ecran=commandes&id=42' } } },
      },
    });

    expect(router.navigate).toHaveBeenCalledWith(['/administration/commandes'], {
      queryParams: { commande: '42', categorie: undefined },
      replaceUrl: false,
    });
  });
});

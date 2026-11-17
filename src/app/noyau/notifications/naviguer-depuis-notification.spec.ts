import { Router } from '@angular/router';

import { naviguerDepuisNotificationPush } from './naviguer-depuis-notification';
import { DemandePanneauNotificationsService } from './demande-panneau-notifications.service';

describe('naviguerDepuisNotificationPush', () => {
  let router: jasmine.SpyObj<Router>;
  let demandePanneau: jasmine.SpyObj<DemandePanneauNotificationsService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    demandePanneau = jasmine.createSpyObj('DemandePanneauNotificationsService', ['demander']);
  });

  it('admin, écran connu : navigue vers l’écran cible (sans ouvrir le panneau)', () => {
    naviguerDepuisNotificationPush(router, 'admin', demandePanneau, 'interventions', '7');

    expect(router.navigate).toHaveBeenCalledWith(['/administration/interventions'], {
      queryParams: { intervention: '7' },
      replaceUrl: false,
    });
    expect(demandePanneau.demander).not.toHaveBeenCalled();
  });

  it('partenaire, écran connu : navigue vers l’écran cible', () => {
    naviguerDepuisNotificationPush(router, 'partenaire', demandePanneau, 'demandes', '3');

    expect(router.navigate).toHaveBeenCalledWith(['/mes-demandes'], {
      queryParams: { demande: '3' },
      replaceUrl: false,
    });
  });

  it('écran inconnu : ouvre le panneau de notifications depuis le tableau de bord', () => {
    naviguerDepuisNotificationPush(router, 'admin', demandePanneau, 'messages', '1');

    expect(demandePanneau.demander).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tableau-de-bord'], { replaceUrl: false });
  });

  it('écran absent : ouvre le panneau de notifications', () => {
    naviguerDepuisNotificationPush(router, 'partenaire', demandePanneau, null, null);

    expect(demandePanneau.demander).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tableau-de-bord'], { replaceUrl: false });
  });

  it('rôle non concerné (client, ou absent) : ouvre le panneau de notifications', () => {
    naviguerDepuisNotificationPush(router, 'client', demandePanneau, 'commandes', '1');

    expect(demandePanneau.demander).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tableau-de-bord'], { replaceUrl: false });
  });

  it('replaceUrl transmis tel quel (OuvrirNotification redirige sans laisser de trace dans l’historique)', () => {
    naviguerDepuisNotificationPush(router, 'admin', demandePanneau, 'commandes', '1', { replaceUrl: true });

    expect(router.navigate).toHaveBeenCalledWith(['/administration/commandes'], {
      queryParams: { commande: '1', categorie: undefined },
      replaceUrl: true,
    });
  });
});

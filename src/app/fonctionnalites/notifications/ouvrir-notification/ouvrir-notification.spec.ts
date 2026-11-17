import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { OuvrirNotification } from './ouvrir-notification';
import { AuthService } from '../../../noyau/auth/auth.service';
import { DemandePanneauNotificationsService } from '../../../noyau/notifications/demande-panneau-notifications.service';

describe('OuvrirNotification', () => {
  let router: jasmine.SpyObj<Router>;
  let demandePanneau: DemandePanneauNotificationsService;
  let fixture: ComponentFixture<OuvrirNotification>;

  async function creer(role: 'admin' | 'partenaire' | 'client' | null, queryParams: Record<string, string>): Promise<void> {
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [OuvrirNotification],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: { role: () => role } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    demandePanneau = TestBed.inject(DemandePanneauNotificationsService);
    fixture = TestBed.createComponent(OuvrirNotification);
    fixture.detectChanges();
  }

  it('admin, écran connu : redirige vers l’écran cible sans laisser de trace dans l’historique', async () => {
    await creer('admin', { ecran: 'commandes', id: '42' });

    expect(router.navigate).toHaveBeenCalledWith(['/administration/commandes'], {
      queryParams: { commande: '42', categorie: undefined },
      replaceUrl: true,
    });
  });

  it('partenaire, écran connu : redirige vers l’écran cible', async () => {
    await creer('partenaire', { ecran: 'demandes', id: '5' });

    expect(router.navigate).toHaveBeenCalledWith(['/mes-demandes'], {
      queryParams: { demande: '5' },
      replaceUrl: true,
    });
  });

  it('écran absent ou inconnu : ouvre le panneau de notifications depuis le tableau de bord', async () => {
    await creer('admin', {});

    expect(router.navigate).toHaveBeenCalledWith(['/tableau-de-bord'], { replaceUrl: true });
    // Module de test frais à chaque `creer()` : le jeton part de 0, demander() l'incrémente une fois.
    expect(demandePanneau.jeton()).toBe(1);
  });
});

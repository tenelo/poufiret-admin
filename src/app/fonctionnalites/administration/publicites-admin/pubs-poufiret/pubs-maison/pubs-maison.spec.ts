import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PubsMaison } from './pubs-maison';
import { PubsPoufiretService } from '../pubs-poufiret.service';
import { CategoriesAdminService } from '../../../categories/categories-admin.service';
import { GeographieService } from '../../../geographie/geographie.service';
import { PubPoufiretAdmin } from '../../../../../modeles/pub-poufiret.model';

const PUB: PubPoufiretAdmin = {
  id: 'p1',
  titre: 'Pub A',
  texte: '',
  image_couverture: null,
  categorie: 1,
  categorie_nom: 'Restaurants',
  categorie_disponible: true,
  est_active: true,
  ordre: 0,
  date_debut: null,
  date_fin: null,
  portee: 'tout',
  region: null,
  departement: null,
  nb_impressions: 10,
  nb_clics: 2,
  taux_clic: 20,
  nb_personnes_touchees: 8,
  impressions_par_type: {},
  cree_le: '2026-01-01T00:00:00Z',
  modifie_le: '2026-01-01T00:00:00Z',
};

describe('PubsMaison', () => {
  let fixture: ComponentFixture<PubsMaison>;
  let composant: PubsMaison;
  let serviceFake: {
    chargerPubs: jasmine.Spy;
    basculerActivePub: jasmine.Spy;
    supprimerPub: jasmine.Spy;
    reordonnerPubs: jasmine.Spy;
  };

  async function creer(pubs: PubPoufiretAdmin[] = [PUB]): Promise<void> {
    serviceFake = {
      chargerPubs: jasmine.createSpy().and.returnValue(of({ count: pubs.length, next: null, previous: null, results: pubs })),
      basculerActivePub: jasmine.createSpy().and.returnValue(of(PUB)),
      supprimerPub: jasmine.createSpy().and.returnValue(of(undefined)),
      reordonnerPubs: jasmine.createSpy().and.returnValue(of({ ids: [] })),
    };
    await TestBed.configureTestingModule({
      imports: [PubsMaison],
      providers: [
        { provide: PubsPoufiretService, useValue: serviceFake },
        { provide: CategoriesAdminService, useValue: { lister: () => of([]) } },
        { provide: GeographieService, useValue: { options: () => of([]) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PubsMaison);
    composant = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('charge et affiche les pubs', async () => {
    await creer();
    expect(serviceFake.chargerPubs).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Pub A');
    expect(fixture.nativeElement.textContent).toContain('Restaurants');
  });

  it('affiche une alerte si categorie_disponible est false', async () => {
    await creer([{ ...PUB, categorie_disponible: false }]);
    expect(fixture.nativeElement.querySelector('.alerte-categorie')).not.toBeNull();
  });

  it('basculerActive : optimiste, et annule (recharge) en cas d’erreur', async () => {
    await creer();
    serviceFake.basculerActivePub.and.returnValue(throwError(() => new Error('refus')));
    composant.basculerActive(PUB);
    // Observables synchrones (of/throwError) : la mise à jour optimiste puis le rechargement sur
    // erreur se produisent dans le même appel, revenant à la valeur d'origine (true).
    expect(composant.pubs()[0].est_active).toBeTrue();
    expect(serviceFake.chargerPubs).toHaveBeenCalledTimes(2); // charger() initial + recharge après l'échec.
  });

  it('confirmerSuppression : retire la pub de la liste après succès', async () => {
    await creer();
    composant.demanderSuppression(PUB);
    composant.confirmerSuppression();
    expect(serviceFake.supprimerPub).toHaveBeenCalledWith('p1');
    expect(composant.pubs().length).toBe(0);
  });

  it('surDepot : réordonne localement puis persiste', async () => {
    const pub2: PubPoufiretAdmin = { ...PUB, id: 'p2', titre: 'Pub B' };
    await creer([PUB, pub2]);
    composant.surDepot({ previousIndex: 0, currentIndex: 1 } as any);
    expect(composant.pubs().map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(serviceFake.reordonnerPubs).toHaveBeenCalledWith(['p2', 'p1']);
  });
});

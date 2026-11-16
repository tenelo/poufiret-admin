import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DialogEcranDecouverte } from './dialog-ecran-decouverte';
import { PubsPoufiretService } from '../../pubs-poufiret.service';

describe('DialogEcranDecouverte', () => {
  let fixture: ComponentFixture<DialogEcranDecouverte>;
  let composant: DialogEcranDecouverte;
  let serviceFake: { creerEcran: jasmine.Spy; modifierEcran: jasmine.Spy };

  async function creer(): Promise<void> {
    serviceFake = {
      creerEcran: jasmine.createSpy().and.returnValue(of({ titre: 'Écran créé' })),
      modifierEcran: jasmine.createSpy(),
    };
    await TestBed.configureTestingModule({
      imports: [DialogEcranDecouverte],
      providers: [{ provide: PubsPoufiretService, useValue: serviceFake }],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogEcranDecouverte);
    composant = fixture.componentInstance;
    fixture.componentRef.setInput('categories', []);
    fixture.detectChanges();
  }

  it('refuse un libellé de bouton sans catégorie', async () => {
    await creer();
    composant.titre.set('Écran');
    composant.image.set(new File(['x'], 'i.png', { type: 'image/png' }));
    composant.boutonLibelle.set('Découvrir');
    composant.soumettre();
    expect(composant.erreursChamps()['bouton_libelle']).toBeTruthy();
    expect(serviceFake.creerEcran).not.toHaveBeenCalled();
  });

  it('refuse une catégorie de bouton sans libellé', async () => {
    await creer();
    composant.titre.set('Écran');
    composant.image.set(new File(['x'], 'i.png', { type: 'image/png' }));
    composant.boutonCategorieId.set(1);
    composant.soumettre();
    expect(composant.erreursChamps()['bouton_libelle']).toBeTruthy();
  });

  it('accepte les deux ensemble, ou aucun des deux', async () => {
    await creer();
    composant.titre.set('Écran');
    composant.image.set(new File(['x'], 'i.png', { type: 'image/png' }));
    composant.boutonLibelle.set('Découvrir');
    composant.boutonCategorieId.set(1);
    composant.soumettre();
    expect(serviceFake.creerEcran).toHaveBeenCalled();
  });
});

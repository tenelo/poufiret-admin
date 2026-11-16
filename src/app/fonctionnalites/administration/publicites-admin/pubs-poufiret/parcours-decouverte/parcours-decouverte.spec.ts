import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ParcoursDecouverte } from './parcours-decouverte';
import { PubsPoufiretService } from '../pubs-poufiret.service';
import { CategoriesAdminService } from '../../../categories/categories-admin.service';
import { EcranDecouverteAdmin } from '../../../../../modeles/pub-poufiret.model';

const ECRAN: EcranDecouverteAdmin = {
  id: 'e1',
  ordre: 0,
  image: null,
  titre: 'Écran 1',
  texte: '',
  bouton_libelle: '',
  bouton_categorie: null,
  bouton_categorie_nom: null,
  bouton_categorie_disponible: null,
  est_actif: true,
  cree_le: '2026-01-01T00:00:00Z',
  modifie_le: '2026-01-01T00:00:00Z',
};

describe('ParcoursDecouverte', () => {
  let fixture: ComponentFixture<ParcoursDecouverte>;
  let composant: ParcoursDecouverte;
  let serviceFake: {
    chargerEcrans: jasmine.Spy;
    chargerReglages: jasmine.Spy;
    publierParcours: jasmine.Spy;
    supprimerEcran: jasmine.Spy;
  };

  async function creer(ecrans: EcranDecouverteAdmin[] = [ECRAN]): Promise<void> {
    serviceFake = {
      chargerEcrans: jasmine.createSpy().and.returnValue(of(ecrans)),
      chargerReglages: jasmine.createSpy().and.returnValue(
        of({
          pubs_maison_actives: true,
          frequence_pub_maison: 3,
          duree_affichage_secondes: 5,
          parcours_actif: true,
          version_parcours: 4,
          modifie_le: '2026-01-01T00:00:00Z',
        }),
      ),
      publierParcours: jasmine.createSpy(),
      supprimerEcran: jasmine.createSpy().and.returnValue(of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ParcoursDecouverte],
      providers: [
        { provide: PubsPoufiretService, useValue: serviceFake },
        { provide: CategoriesAdminService, useValue: { lister: () => of([]) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ParcoursDecouverte);
    composant = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('affiche la version actuelle et le nombre d’écrans actifs', async () => {
    await creer();
    expect(fixture.nativeElement.textContent).toContain('Version actuelle : 4');
    expect(fixture.nativeElement.textContent).toContain('1 écran(s) actif(s) sur 1');
  });

  it('publier : affiche le message du serveur tel quel en cas de 400', async () => {
    await creer();
    serviceFake.publierParcours.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { erreur: true, message: 'Le parcours doit compter entre 3 et 8 écrans actifs (actuellement 1).' },
          }),
      ),
    );
    composant.publier();
    fixture.detectChanges();
    expect(composant.erreurPublication()).toBe('Le parcours doit compter entre 3 et 8 écrans actifs (actuellement 1).');
    expect(fixture.nativeElement.textContent).toContain('entre 3 et 8 écrans actifs');
  });

  it('publier : succès, met à jour la version affichée', async () => {
    await creer();
    serviceFake.publierParcours.and.returnValue(of({ version_parcours: 5, nb_ecrans: 4, parcours_actif: true }));
    composant.publier();
    expect(composant.versionParcours()).toBe(5);
  });

  it('confirmerSuppression : retire l’écran de la liste', async () => {
    await creer();
    composant.demanderSuppression(ECRAN);
    composant.confirmerSuppression();
    expect(serviceFake.supprimerEcran).toHaveBeenCalledWith('e1');
    expect(composant.ecrans().length).toBe(0);
  });
});

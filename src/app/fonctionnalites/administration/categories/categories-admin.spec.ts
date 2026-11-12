import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CategoriesAdmin } from './categories-admin';
import { CategoriesAdminService } from './categories-admin.service';
import { DialogCategorie } from './dialog-categorie/dialog-categorie';
import { CategorieAdmin } from '../../../modeles/categorie-admin.model';

const FAST_FOOD: CategorieAdmin = {
  id: 1,
  nom: 'Restauration',
  slug: 'restauration',
  description: '',
  icone: null,
  image: null,
  ordre: 0,
  est_active: true,
  est_archivee: false,
  parent_id: null,
  parent_nom: null,
  types_partenaire: ['fast_food'],
  mots_cles: [],
  nb_partenaires: 0,
  nb_enfants: 0,
  affichage_enfants: 'pastilles',
};

const MESSAGE_GENERIQUE = 'Une erreur est survenue. Veuillez réessayer.';

function erreur400(corps: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, statusText: 'Bad Request', error: corps });
}

/** Fenêtre catégorie : raisons du refus (400) affichées avec le libellé du champ. */
describe('CategoriesAdmin — erreurs d’enregistrement', () => {
  let fixture: ComponentFixture<CategoriesAdmin>;
  let reponse: () => ReturnType<CategoriesAdminService['modifier']>;

  beforeEach(async () => {
    reponse = () => of(FAST_FOOD);
    const serviceFake: Partial<CategoriesAdminService> = {
      lister: () => of([FAST_FOOD]),
      listerTypesPartenaire: () => of([]),
      creer: () => reponse(),
      modifier: () => reponse(),
    };
    await TestBed.configureTestingModule({
      imports: [CategoriesAdmin],
      providers: [provideRouter([]), { provide: CategoriesAdminService, useValue: serviceFake }],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoriesAdmin);
    fixture.detectChanges();
  });

  function ouvrirEtEnregistrer(erreur: unknown): DialogCategorie {
    reponse = () => throwError(() => erreur);
    fixture.componentInstance.ouvrirEdition(FAST_FOOD);
    fixture.detectChanges();
    const dialog = fixture.debugElement.query((d) => d.componentInstance instanceof DialogCategorie)
      .componentInstance as DialogCategorie;
    dialog.description.set('Texte saisi avant l’erreur');
    dialog.soumettre();
    fixture.detectChanges();
    return dialog;
  }

  function texteErreurs(): string {
    return (fixture.nativeElement.querySelector('.erreur-generale') as HTMLElement | null)?.textContent ?? '';
  }

  it('affiche le message du serveur précédé du libellé du champ', () => {
    ouvrirEtEnregistrer(
      erreur400({
        erreur: true,
        code: 'validation',
        message: MESSAGE_GENERIQUE,
        details: { types_partenaire: ['Le type « Fast-food » est déjà déclaré sur la catégorie « Fast-food ».'] },
      }),
    );
    expect(texteErreurs()).toContain(
      'Types de partenaire liés : Le type « Fast-food » est déjà déclaré sur la catégorie « Fast-food ».',
    );
    expect(texteErreurs()).not.toContain(MESSAGE_GENERIQUE);
  });

  it('affiche plusieurs erreurs, chacune avec son libellé', () => {
    ouvrirEtEnregistrer(
      erreur400({
        erreur: true,
        code: 'validation',
        message: MESSAGE_GENERIQUE,
        details: {
          parent_id: ['Une sous-catégorie ne peut pas être parente.'],
          mots_cles: ['Mot-clé trop long.'],
          max_photos_par_article: ['Valeur entre 1 et 4.'],
          non_field_errors: ['Catégorie archivée.'],
        },
      }),
    );
    const lignes = Array.from(fixture.nativeElement.querySelectorAll('.ligne-erreur') as NodeListOf<HTMLElement>).map(
      (l) => l.textContent!.trim(),
    );
    expect(lignes).toEqual([
      'Catégorie archivée.',
      'Catégorie parente : Une sous-catégorie ne peut pas être parente.',
      'Mots-clés de recherche : Mot-clé trop long.',
      'Nombre maximum de photos par article : Valeur entre 1 et 4.',
    ]);
  });

  it('garde l’erreur sur le nom sous son champ', () => {
    ouvrirEtEnregistrer(
      erreur400({ erreur: true, message: MESSAGE_GENERIQUE, details: { nom: ['Ce nom existe déjà.'] } }),
    );
    expect(fixture.nativeElement.querySelector('.erreur-champ')?.textContent).toContain('Ce nom existe déjà.');
  });

  it('se replie sur le message générique sans details ni message exploitable', () => {
    ouvrirEtEnregistrer(erreur400({ erreur: true, code: 'inconnu' }));
    expect(texteErreurs()).toContain(MESSAGE_GENERIQUE);
    expect(fixture.nativeElement.querySelectorAll('.ligne-erreur').length).toBe(0);
  });

  it('garde le message générique pour une erreur serveur (500)', () => {
    ouvrirEtEnregistrer(new HttpErrorResponse({ status: 500, error: '<!doctype html><title>500</title>' }));
    expect(texteErreurs()).toContain(MESSAGE_GENERIQUE);
  });

  it('laisse la fenêtre ouverte et conserve les valeurs saisies', () => {
    const dialog = ouvrirEtEnregistrer(
      erreur400({ erreur: true, message: MESSAGE_GENERIQUE, details: { image: ['Format non pris en charge.'] } }),
    );
    expect(fixture.componentInstance.dialogOuvert()).toBeTrue();
    const dialogApres = fixture.debugElement.query((d) => d.componentInstance instanceof DialogCategorie)
      .componentInstance as DialogCategorie;
    expect(dialogApres).toBe(dialog);
    expect(dialogApres.nom()).toBe('Restauration');
    expect(dialogApres.description()).toBe('Texte saisi avant l’erreur');
    expect(dialogApres.typesSelectionnes().has('fast_food')).toBeTrue();
    expect(texteErreurs()).toContain('Image : Format non pris en charge.');
  });
});

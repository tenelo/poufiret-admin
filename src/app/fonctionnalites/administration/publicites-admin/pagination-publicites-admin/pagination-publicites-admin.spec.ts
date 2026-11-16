import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationPublicitesAdmin } from './pagination-publicites-admin';

describe('PaginationPublicitesAdmin', () => {
  let fixture: ComponentFixture<PaginationPublicitesAdmin>;
  let composant: PaginationPublicitesAdmin;

  async function creer(entrees: {
    champTri?: string;
    triDescendant?: boolean;
    page?: number;
    pageSize?: number;
    count?: number;
  } = {}): Promise<void> {
    await TestBed.configureTestingModule({ imports: [PaginationPublicitesAdmin] }).compileComponents();
    fixture = TestBed.createComponent(PaginationPublicitesAdmin);
    composant = fixture.componentInstance;
    fixture.componentRef.setInput('optionsTri', [
      { valeur: 'cree_le', libelle: 'Plus récentes' },
      { valeur: 'titre', libelle: 'Titre' },
    ]);
    fixture.componentRef.setInput('champTri', entrees.champTri ?? 'cree_le');
    fixture.componentRef.setInput('triDescendant', entrees.triDescendant ?? true);
    fixture.componentRef.setInput('page', entrees.page ?? 1);
    fixture.componentRef.setInput('pageSize', entrees.pageSize ?? 25);
    fixture.componentRef.setInput('count', entrees.count ?? 60);
    fixture.detectChanges();
  }

  it('calcule le nombre de pages (arrondi au-dessus)', async () => {
    await creer({ count: 60, pageSize: 25 });
    expect(composant.nbPages()).toBe(3);
  });

  it('émet triChange au changement de champ, en conservant la direction', async () => {
    await creer({ triDescendant: false });
    const emis = jasmine.createSpy('triChange');
    composant.triChange.subscribe(emis);
    composant.choisirChamp('titre');
    expect(emis).toHaveBeenCalledWith({ champ: 'titre', descendant: false });
  });

  it('émet triChange en inversant la direction au clic sur le bouton ↓/↑', async () => {
    await creer({ triDescendant: true });
    const emis = jasmine.createSpy('triChange');
    composant.triChange.subscribe(emis);
    composant.basculerDirection();
    expect(emis).toHaveBeenCalledWith({ champ: 'cree_le', descendant: false });
  });

  it('émet pageSizeChange et pageChange', async () => {
    await creer();
    const taille = jasmine.createSpy('pageSizeChange');
    const page = jasmine.createSpy('pageChange');
    composant.pageSizeChange.subscribe(taille);
    composant.pageChange.subscribe(page);

    composant.choisirTaillePage('50');
    expect(taille).toHaveBeenCalledWith(50);

    composant.pageSuivante();
    expect(page).toHaveBeenCalledWith(2);
  });

  it('ne recule pas avant la page 1, ni n’avance après la dernière page', async () => {
    await creer({ page: 1, count: 10, pageSize: 25 });
    const page = jasmine.createSpy('pageChange');
    composant.pageChange.subscribe(page);

    composant.pagePrecedente();
    composant.pageSuivante(); // une seule page (10/25) : pas de page suivante non plus.
    expect(page).not.toHaveBeenCalled();
  });

  it('désactive les boutons Précédent/Suivant aux bornes', async () => {
    await creer({ page: 1, count: 10, pageSize: 25 });
    const boutons = fixture.nativeElement.querySelectorAll('.groupe-pager button') as NodeListOf<HTMLButtonElement>;
    expect(boutons[0].disabled).toBeTrue(); // Précédent, page 1.
    expect(boutons[1].disabled).toBeTrue(); // Suivant, une seule page.
  });
});

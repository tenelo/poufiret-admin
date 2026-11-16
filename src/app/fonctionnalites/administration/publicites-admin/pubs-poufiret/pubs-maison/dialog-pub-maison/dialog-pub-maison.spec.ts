import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { DialogPubMaison } from './dialog-pub-maison';
import { PubsPoufiretService } from '../../pubs-poufiret.service';
import { CategorieAdmin } from '../../../../../../modeles/categorie-admin.model';
import { PubPoufiretAdmin } from '../../../../../../modeles/pub-poufiret.model';

const CATEGORIE: CategorieAdmin = {
  id: 1,
  nom: 'Restaurants',
  slug: 'restaurants',
  description: '',
  icone: null,
  image: null,
  ordre: 0,
  est_active: true,
  est_archivee: false,
  parent_id: null,
  parent_nom: null,
  types_partenaire: [],
  mots_cles: [],
  nb_partenaires: 0,
  nb_enfants: 0,
  affichage_enfants: 'pastilles',
};

const PUB_EXISTANTE: PubPoufiretAdmin = {
  id: 'p1',
  titre: 'Pub existante',
  texte: 'Texte',
  image_couverture: 'https://x/img.png',
  categorie: 1,
  categorie_nom: 'Restaurants',
  categorie_disponible: true,
  est_active: true,
  ordre: 0,
  date_debut: '2026-01-01T00:00:00Z',
  date_fin: null,
  portee: 'region',
  region: 3,
  departement: null,
  nb_impressions: 0,
  nb_clics: 0,
  taux_clic: 0,
  nb_personnes_touchees: 0,
  impressions_par_type: {},
  cree_le: '2026-01-01T00:00:00Z',
  modifie_le: '2026-01-01T00:00:00Z',
};

describe('DialogPubMaison', () => {
  let fixture: ComponentFixture<DialogPubMaison>;
  let composant: DialogPubMaison;
  let serviceFake: { creerPub: jasmine.Spy; modifierPub: jasmine.Spy };

  async function creer(pub: PubPoufiretAdmin | null = null): Promise<void> {
    serviceFake = {
      creerPub: jasmine.createSpy().and.returnValue(of({ titre: 'Nouvelle pub' })),
      modifierPub: jasmine.createSpy().and.returnValue(of({ titre: 'Pub modifiée' })),
    };
    await TestBed.configureTestingModule({
      imports: [DialogPubMaison],
      providers: [{ provide: PubsPoufiretService, useValue: serviceFake }],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogPubMaison);
    composant = fixture.componentInstance;
    fixture.componentRef.setInput('pub', pub);
    fixture.componentRef.setInput('categories', [CATEGORIE]);
    fixture.detectChanges();
  }

  it('création : exige titre, catégorie et image', async () => {
    await creer();
    composant.soumettre();
    expect(composant.erreursChamps()['titre']).toBeTruthy();
    expect(composant.erreursChamps()['categorie']).toBeTruthy();
    expect(composant.erreursChamps()['image_couverture']).toBeTruthy();
    expect(serviceFake.creerPub).not.toHaveBeenCalled();
  });

  it('création : exige une région si la portée est « région »', async () => {
    await creer();
    composant.titre.set('Pub');
    composant.categorieId.set(1);
    composant.image.set(new File(['x'], 'i.png', { type: 'image/png' }));
    composant.changerPortee('region');
    composant.soumettre();
    expect(composant.erreursChamps()['region']).toBeTruthy();
    expect(serviceFake.creerPub).not.toHaveBeenCalled();
  });

  it('création : envoie les données valides et émet reussi', async () => {
    await creer();
    const reussi = jasmine.createSpy('reussi');
    composant.reussi.subscribe(reussi);
    composant.titre.set('Pub');
    composant.categorieId.set(1);
    composant.image.set(new File(['x'], 'i.png', { type: 'image/png' }));
    composant.soumettre();
    expect(serviceFake.creerPub).toHaveBeenCalled();
    expect(reussi).toHaveBeenCalledWith('Pub « Nouvelle pub » créée.');
  });

  it('modification : préremplit depuis la pub existante (une seule fois)', async () => {
    await creer(PUB_EXISTANTE);
    expect(composant.titre()).toBe('Pub existante');
    expect(composant.dateDebut()).toBe('2026-01-01');
    expect(composant.portee()).toBe('region');
    expect(composant.regionId()).toBe(3);
    // Pas d'image obligatoire en modification.
    composant.soumettre();
    expect(serviceFake.modifierPub).toHaveBeenCalledWith('p1', jasmine.any(Object));
  });

  it('erreur 400 du serveur : messages par champ affichés', async () => {
    await creer();
    serviceFake.creerPub.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { categorie: ['Catégorie cible obligatoire.'] } })),
    );
    composant.titre.set('Pub');
    composant.categorieId.set(1);
    composant.image.set(new File(['x'], 'i.png', { type: 'image/png' }));
    composant.soumettre();
    expect(composant.erreursChamps()['categorie']).toBe('Catégorie cible obligatoire.');
  });
});

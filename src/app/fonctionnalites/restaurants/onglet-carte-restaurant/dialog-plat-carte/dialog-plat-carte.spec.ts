import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DialogPlatCarte } from './dialog-plat-carte';
import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { GABARITS_CONTRAT } from '../../../../modeles/gabarit.model';
import { PlatCarte } from '../../../../modeles/carte-restaurant.model';

const API_URL = 'https://api.test/v1';
const GABARIT_FAST_FOOD = GABARITS_CONTRAT['fast_food'];

function platFlushe(partiel: Partial<PlatCarte> = {}): PlatCarte {
  return {
    id: 1,
    partenaire: 1,
    nom: 'Menu Burger',
    slug: 'menu-burger',
    description: null,
    categorie: null,
    section_menu: null,
    section_menu_nom: null,
    prix: 2500,
    prix_promotion: null,
    prix_effectif: 2500,
    est_en_promotion: false,
    est_actif: true,
    est_disponible: true,
    est_epuise: false,
    est_reserve_aux_menus: false,
    ordre: 0,
    temps_preparation_min: null,
    details: null,
    fiche_specifique: null,
    images: [],
    variantes: [],
    groupes_options: [],
    modifie_par_role: null,
    modifie_par_nom: null,
    modifie_le: null,
    ...partiel,
  };
}

/**
 * Temps de préparation (commun à tous les gabarits) et champs spécifiques fast-food (« Formule /
 * combo » + « Prix au lieu de », visible seulement si la formule est cochée).
 */
describe('DialogPlatCarte — temps de préparation et champs fast-food', () => {
  let fixture: ComponentFixture<DialogPlatCarte>;
  let component: DialogPlatCarte;
  let httpMock: HttpTestingController;

  async function creer(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DialogPlatCarte],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationService, useValue: { apiUrl: API_URL, production: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogPlatCarte);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('prefixe', 'mon-restaurant');
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('gabarit', GABARIT_FAST_FOOD);
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('masque « Prix au lieu de » tant que « Formule / combo » n\'est pas cochée', async () => {
    await creer();
    const champPrixReference = GABARIT_FAST_FOOD.champs.find((c) => c.cle === 'prix_reference')!;

    expect(component.estChampVisible(champPrixReference)).toBeFalse();
    component.changerValeurFiche('est_combo', true);
    expect(component.estChampVisible(champPrixReference)).toBeTrue();
  });

  it('refuse un temps de préparation hors 0-600 ou non entier, sans appeler le service', async () => {
    await creer();
    component.nom.set('Menu Burger');
    component.prix.set('2500');
    component.tempsPreparationMin.set('700');

    component.soumettre();

    expect(component.erreursChamps()['tempsPreparationMin']).toBeTruthy();
    httpMock.expectNone(`${API_URL}/restaurants/mon-restaurant/carte/plats/`);
  });

  it('accepte un temps de préparation vide (null) et un entier valide (0-600)', async () => {
    await creer();
    component.nom.set('Menu Burger');
    component.prix.set('2500');
    component.tempsPreparationMin.set('15');

    component.soumettre();

    const requete = httpMock.expectOne(`${API_URL}/restaurants/mon-restaurant/carte/plats/`);
    expect(requete.request.body.temps_preparation_min).toBe(15);
    requete.flush(platFlushe({ temps_preparation_min: 15 }));
  });

  it('force prix_reference à null et est_combo à false quand la formule est décochée, même avec une ancienne valeur', async () => {
    await creer();
    component.nom.set('Menu Burger');
    component.prix.set('2500');
    // Valeur orpheline : saisie avant de décocher la formule (champ alors masqué par estChampVisible).
    component.changerValeurFiche('prix_reference', '5000');

    component.soumettre();

    const requete = httpMock.expectOne(`${API_URL}/restaurants/mon-restaurant/carte/plats/`);
    expect(requete.request.body.fiche_specifique).toEqual({ est_combo: false, prix_reference: null });
    requete.flush(platFlushe());
  });

  it('envoie prix_reference une fois la formule cochée et un prix de référence saisi', async () => {
    await creer();
    component.nom.set('Menu Burger');
    component.prix.set('2500');
    component.changerValeurFiche('est_combo', true);
    component.changerValeurFiche('prix_reference', '3500');

    component.soumettre();

    const requete = httpMock.expectOne(`${API_URL}/restaurants/mon-restaurant/carte/plats/`);
    expect(requete.request.body.fiche_specifique).toEqual({ est_combo: true, prix_reference: 3500 });
    requete.flush(platFlushe());
  });
});

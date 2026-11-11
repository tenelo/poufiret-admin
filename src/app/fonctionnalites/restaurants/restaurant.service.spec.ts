import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RestaurantService } from './restaurant.service';
import { ConfigurationService } from '../../noyau/config/configuration.service';

const API_URL = 'https://api.test/v1';

/**
 * Le plafond de photos d'un plat est lu dans la clé plafond_photos de la 1re page de la liste
 * (GET P/carte/plats/<id>/images/), jamais dans un champ nb_photos_max inexistant sur le plat.
 * Absent de la réponse (backend plus ancien) : plafond reste null, aucune limite appliquée.
 */
describe('RestaurantService.listerImagesPlat', () => {
  let service: RestaurantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationService, useValue: { apiUrl: API_URL, production: false } },
      ],
    });
    service = TestBed.inject(RestaurantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lit le plafond dans plafond_photos de la réponse', () => {
    let resultat: { images: unknown[]; plafond: unknown } | undefined;
    service.listerImagesPlat('mon-espace', 9).subscribe((r) => (resultat = r));

    const requete = httpMock.expectOne((r) => r.url === `${API_URL}/restaurants/mon-espace/carte/plats/9/images/`);
    requete.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, plat: 9, image: 'a.jpg', legende: null, ordre: 0, est_principale: true, est_active: true }],
      plafond_photos: {
        max: 3,
        source: 'abonnement',
        categorie_id: null,
        categorie_nom: null,
        plan_libelle: 'Premium',
        nb_photos: 1,
        peut_ajouter: true,
      },
    });

    expect(resultat?.images.length).toBe(1);
    expect(resultat?.plafond).toEqual({
      max: 3,
      source: 'abonnement',
      categorie_id: null,
      categorie_nom: null,
      plan_libelle: 'Premium',
      nb_photos: 1,
      peut_ajouter: true,
    });
  });

  it('renvoie un plafond null quand plafond_photos est absent de la réponse', () => {
    let resultat: { images: unknown[]; plafond: unknown } | undefined;
    service.listerImagesPlat('mon-espace', 9).subscribe((r) => (resultat = r));

    const requete = httpMock.expectOne((r) => r.url === `${API_URL}/restaurants/mon-espace/carte/plats/9/images/`);
    requete.flush({ count: 0, next: null, previous: null, results: [] });

    expect(resultat?.plafond).toBeNull();
  });
});

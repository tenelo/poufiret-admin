import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MesProduitsService } from './mes-produits.service';
import { ConfigurationService } from '../../../noyau/config/configuration.service';

const API_URL = 'https://api.test/v1';

/**
 * Le plafond de photos d'un article est lu dans la clé plafond_photos de la réponse de la
 * liste (GET /catalogue/images/?article=<id>), jamais dans un champ nb_photos_max inexistant
 * sur l'article. Absent de la réponse (backend plus ancien, ou réponse en tableau brut) : le
 * plafond reste null, à l'appelant de retomber sur le quota du forfait.
 */
describe('MesProduitsService.listerImages', () => {
  let service: MesProduitsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationService, useValue: { apiUrl: API_URL, production: false } },
      ],
    });
    service = TestBed.inject(MesProduitsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lit le plafond dans plafond_photos quand la réponse l’expose', () => {
    let resultat: { images: unknown[]; plafond: unknown } | undefined;
    service.listerImages(42).subscribe((r) => (resultat = r));

    const requete = httpMock.expectOne((r) => r.url === `${API_URL}/catalogue/images/`);
    requete.flush({
      results: [{ id: 1, article: 42, image: 'a.jpg', legende: null, ordre: 0, est_principale: true, est_active: true }],
      plafond_photos: {
        max: 4,
        source: 'categorie',
        categorie_id: 7,
        categorie_nom: 'Plats',
        plan_libelle: null,
        nb_photos: 1,
        peut_ajouter: true,
      },
    });

    expect(resultat?.images.length).toBe(1);
    expect(resultat?.plafond).toEqual({
      max: 4,
      source: 'categorie',
      categorie_id: 7,
      categorie_nom: 'Plats',
      plan_libelle: null,
      nb_photos: 1,
      peut_ajouter: true,
    });
  });

  it('renvoie un plafond null quand plafond_photos est absent de la réponse paginée', () => {
    let resultat: { images: unknown[]; plafond: unknown } | undefined;
    service.listerImages(42).subscribe((r) => (resultat = r));

    const requete = httpMock.expectOne((r) => r.url === `${API_URL}/catalogue/images/`);
    requete.flush({ results: [] });

    expect(resultat?.plafond).toBeNull();
  });

  it('accepte aussi une réponse en tableau brut, avec un plafond null', () => {
    let resultat: { images: unknown[]; plafond: unknown } | undefined;
    service.listerImages(42).subscribe((r) => (resultat = r));

    const requete = httpMock.expectOne((r) => r.url === `${API_URL}/catalogue/images/`);
    requete.flush([
      { id: 1, article: 42, image: 'a.jpg', legende: null, ordre: 0, est_principale: true, est_active: true },
    ]);

    expect(resultat?.images.length).toBe(1);
    expect(resultat?.plafond).toBeNull();
  });
});

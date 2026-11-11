import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionImages } from './gestion-images';
import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { PlafondPhotosArticle } from '../../../../modeles/image-article.model';

const API = 'https://api.test/api/v1';

function imagesDe(nbImages: number) {
  return Array.from({ length: nbImages }, (_, i) => ({
    id: i + 1,
    article: 5,
    image: `https://img.test/${i}.png`,
    legende: null,
    ordre: i,
    est_principale: i === 0,
    est_active: true,
  }));
}

/** Le plafond effectif (quotaMax, repli du forfait) pilote le compteur et l'ajout de AjoutPhotos
 *  quand la réponse de la liste n'expose pas plafond_photos (voir aussi le describe suivant). */
describe('GestionImages — plafond de photos (repli forfait)', () => {
  async function creer(quotaMax: number, nbImages: number) {
    await TestBed.configureTestingModule({
      imports: [GestionImages],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConfigurationService, useValue: { apiUrl: API } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(GestionImages);
    fixture.componentRef.setInput('articleId', 5);
    fixture.componentRef.setInput('quotaMax', quotaMax);
    fixture.detectChanges();
    // Réponse brute (tableau), sans plafond_photos : repli sur le quota du forfait (quotaMax).
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === `${API}/catalogue/images/`)
      .flush(imagesDe(nbImages));
    fixture.detectChanges();
    return fixture;
  }

  it('affiche « n / max » et laisse ajouter sous le plafond', async () => {
    const fixture = await creer(4, 2);
    expect(fixture.nativeElement.textContent).toContain('2 / 4 photos');
    expect((fixture.nativeElement.querySelector('.bouton-ajouter') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('désactive l’ajout au plafond', async () => {
    const fixture = await creer(2, 2);
    expect(fixture.nativeElement.textContent).toContain('2 / 2 photos');
    expect((fixture.nativeElement.querySelector('.bouton-ajouter') as HTMLButtonElement).disabled).toBeTrue();
  });
});

/** plafond_photos (clé de la réponse de la liste) prime toujours sur le repli du forfait. */
describe('GestionImages — plafond lu dans plafond_photos', () => {
  async function creer(quotaMaxForfait: number, nbImages: number, plafondPhotos: PlafondPhotosArticle) {
    await TestBed.configureTestingModule({
      imports: [GestionImages],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConfigurationService, useValue: { apiUrl: API } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(GestionImages);
    fixture.componentRef.setInput('articleId', 5);
    fixture.componentRef.setInput('quotaMax', quotaMaxForfait);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === `${API}/catalogue/images/`)
      .flush({ results: imagesDe(nbImages), plafond_photos: plafondPhotos });
    fixture.detectChanges();
    return fixture;
  }

  const PLAFOND_CATEGORIE: PlafondPhotosArticle = {
    max: 2,
    source: 'categorie',
    categorie_id: 7,
    categorie_nom: 'Plats',
    plan_libelle: null,
    nb_photos: 2,
    peut_ajouter: false,
  };

  it('utilise plafond_photos.max plutôt que le quota du forfait, même plus permissif', async () => {
    // Forfait à 10, mais la catégorie plafonne à 2 : plafond_photos doit l'emporter.
    const fixture = await creer(10, 2, PLAFOND_CATEGORIE);
    expect(fixture.nativeElement.textContent).toContain('2 / 2 photos');
    expect((fixture.nativeElement.querySelector('.bouton-ajouter') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('max: null (illimité) affiche un compteur sans plafond', async () => {
    const illimite: PlafondPhotosArticle = { ...PLAFOND_CATEGORIE, max: null, source: 'abonnement', categorie_id: null, categorie_nom: null };
    const fixture = await creer(10, 2, illimite);
    expect(fixture.nativeElement.textContent).toContain('2 photo');
    expect((fixture.nativeElement.querySelector('.bouton-ajouter') as HTMLButtonElement).disabled).toBeFalse();
  });
});

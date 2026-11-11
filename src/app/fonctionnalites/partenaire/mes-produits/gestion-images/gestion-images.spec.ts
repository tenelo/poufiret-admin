import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionImages } from './gestion-images';
import { ConfigurationService } from '../../../../noyau/config/configuration.service';

const API = 'https://api.test/api/v1';

/** Le plafond effectif (quotaMax) pilote le compteur et l'ajout de AjoutPhotos. */
describe('GestionImages — plafond de photos', () => {
  async function creer(quotaMax: number, nbImages: number) {
    await TestBed.configureTestingModule({
      imports: [GestionImages],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConfigurationService, useValue: { apiUrl: API } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(GestionImages);
    fixture.componentRef.setInput('articleId', 5);
    fixture.componentRef.setInput('quotaMax', quotaMax);
    fixture.detectChanges();
    const images = Array.from({ length: nbImages }, (_, i) => ({
      id: i + 1,
      article: 5,
      image: `https://img.test/${i}.png`,
      legende: null,
      ordre: i,
      est_principale: i === 0,
      est_active: true,
    }));
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === `${API}/catalogue/images/`).flush(images);
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

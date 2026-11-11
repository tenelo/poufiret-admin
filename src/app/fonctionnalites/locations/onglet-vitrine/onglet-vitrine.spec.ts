import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { OngletVitrine } from './onglet-vitrine';
import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { ImageVitrine, Vitrine } from '../../../modeles/vitrine-etablissement.model';

const API_URL = 'https://api.test/v1';
const URL_VITRINE = `${API_URL}/locations/mon-espace/vitrine/`;

function creerImage(index: number): ImageVitrine {
  return {
    id: `img-${index}`,
    source: 'propre',
    url: `https://img/${index}.jpg`,
    legende: null,
    ordre: index,
    image_hebergement_id: null,
    hebergement_id: null,
    hebergement_nom: null,
    cree_le: '2026-01-01T00:00:00Z',
    modifie_le: '2026-01-01T00:00:00Z',
  };
}

function creerVitrine(nbImages: number, nbMax = 10): Vitrine {
  return {
    nb_max_images: nbMax,
    nb_images: nbImages,
    images: Array.from({ length: nbImages }, (_, i) => creerImage(i)),
    photos_disponibles: [],
  };
}

describe('OngletVitrine', () => {
  let fixture: ComponentFixture<OngletVitrine>;
  let component: OngletVitrine;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OngletVitrine],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationService, useValue: { apiUrl: API_URL, production: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OngletVitrine);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('prefixe', 'mon-espace');
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('affiche la vitrine chargée (compteur et vignettes)', () => {
    fixture.detectChanges();
    httpMock.expectOne(URL_VITRINE).flush(creerVitrine(2, 10));
    fixture.detectChanges();

    expect(component.vitrine()?.nb_images).toBe(2);
    const compteur: HTMLElement = fixture.nativeElement.querySelector('.compteur');
    expect(compteur.textContent).toContain('2 / 10');
    expect(fixture.nativeElement.querySelectorAll('.vignette-vitrine').length).toBe(2);
  });

  it('désactive les deux boutons d’ajout quand la vitrine est pleine', () => {
    fixture.detectChanges();
    httpMock.expectOne(URL_VITRINE).flush(creerVitrine(10, 10));
    fixture.detectChanges();

    expect(component.vitrinePleine()).toBe(true);
    const boutons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.actions-ajout .bouton-secondaire');
    expect(boutons.length).toBe(2);
    boutons.forEach((bouton) => expect(bouton.disabled).toBe(true));
  });

  it('ne désactive pas les boutons d’ajout quand la vitrine a encore de la place', () => {
    fixture.detectChanges();
    httpMock.expectOne(URL_VITRINE).flush(creerVitrine(3, 10));
    fixture.detectChanges();

    const boutons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.actions-ajout .bouton-secondaire');
    boutons.forEach((bouton) => expect(bouton.disabled).toBe(false));
  });

  it('réordonnance en un seul appel POST .../vitrine/ordre/', () => {
    fixture.detectChanges();
    httpMock.expectOne(URL_VITRINE).flush(creerVitrine(3, 10));
    fixture.detectChanges();

    const evenement = { previousIndex: 0, currentIndex: 2 } as CdkDragDrop<ImageVitrine[]>;
    component.surDepot(evenement);

    const requete = httpMock.expectOne(`${URL_VITRINE}ordre/`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ ids: ['img-1', 'img-2', 'img-0'] });

    requete.flush(creerVitrine(3, 10));
  });
});

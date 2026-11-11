import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoisirPhotoVitrine } from './choisir-photo-vitrine';
import { PhotoDisponibleVitrine } from '../../../../modeles/vitrine-etablissement.model';

/** Une photo déjà dans la vitrine (dans_vitrine: true) doit être marquée et non sélectionnable. */
describe('ChoisirPhotoVitrine', () => {
  let fixture: ComponentFixture<ChoisirPhotoVitrine>;
  let component: ChoisirPhotoVitrine;

  const photos: PhotoDisponibleVitrine[] = [
    { id: 1, url: 'a.jpg', hebergement_id: 10, hebergement_nom: 'Chambre 1', est_principale: true, dans_vitrine: false },
    { id: 2, url: 'b.jpg', hebergement_id: 10, hebergement_nom: 'Chambre 1', est_principale: false, dans_vitrine: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChoisirPhotoVitrine] }).compileComponents();

    fixture = TestBed.createComponent(ChoisirPhotoVitrine);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
  });

  it('désactive la vignette et ne émet rien pour une photo déjà dans la vitrine', () => {
    const emises: PhotoDisponibleVitrine[] = [];
    component.choisie.subscribe((photo) => emises.push(photo));

    const boutons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.vignette-photo');
    expect(boutons.length).toBe(2);
    expect(boutons[1].disabled).withContext('photo déjà dans la vitrine : bouton désactivé').toBe(true);

    boutons[1].click();
    expect(emises).toEqual([]);
  });

  it('émet la photo choisie pour une photo disponible', () => {
    const emises: PhotoDisponibleVitrine[] = [];
    component.choisie.subscribe((photo) => emises.push(photo));

    const boutons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.vignette-photo');
    boutons[0].click();

    expect(emises).toEqual([photos[0]]);
  });
});

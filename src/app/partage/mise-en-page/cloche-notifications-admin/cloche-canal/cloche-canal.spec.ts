import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClocheCanal } from './cloche-canal';

/**
 * Ouverture/fermeture du panneau d'une cloche : le bouton émet `bascule`, le panneau s'affiche
 * quand `panneauOuvert` est vrai, et un clic hors de la cloche (document) la referme — mais pas un
 * clic à l'intérieur du panneau lui-même. Couvre la régression « le panneau s'ouvre mais reste
 * invisible ou se referme aussitôt ».
 */
describe('ClocheCanal', () => {
  let fixture: ComponentFixture<ClocheCanal>;
  let component: ClocheCanal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ClocheCanal] }).compileComponents();

    fixture = TestBed.createComponent(ClocheCanal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('libelleAccessibilite', 'notification test');
    fixture.componentRef.setInput('titrePanneau', 'Test');
    fixture.componentRef.setInput('nbNonLues', 0);
    fixture.componentRef.setInput('texteBadge', '0');
    fixture.componentRef.setInput('notifications', []);
    fixture.detectChanges();
  });

  it('émet "bascule" au clic sur le bouton cloche', () => {
    let nbEmissions = 0;
    component.bascule.subscribe(() => nbEmissions++);

    const bouton: HTMLButtonElement = fixture.nativeElement.querySelector('.bouton-cloche');
    bouton.click();

    expect(nbEmissions).toBe(1);
  });

  it('affiche le panneau dans le DOM quand panneauOuvert=true', () => {
    fixture.componentRef.setInput('panneauOuvert', true);
    fixture.detectChanges();

    const panneau = fixture.nativeElement.querySelector('.panneau-notifications');
    expect(panneau).withContext('le panneau doit être présent dans le DOM, pas seulement le compteur').not.toBeNull();
  });

  it('ne rend aucun panneau quand panneauOuvert=false', () => {
    const panneau = fixture.nativeElement.querySelector('.panneau-notifications');
    expect(panneau).toBeNull();
  });

  it('émet "bascule" sur un clic en dehors de la cloche quand le panneau est ouvert', () => {
    fixture.componentRef.setInput('panneauOuvert', true);
    fixture.detectChanges();

    let nbEmissions = 0;
    component.bascule.subscribe(() => nbEmissions++);

    document.body.click();

    expect(nbEmissions).toBe(1);
  });

  it("ne se referme pas sur un clic à l'intérieur du panneau", () => {
    fixture.componentRef.setInput('panneauOuvert', true);
    fixture.detectChanges();

    let nbEmissions = 0;
    component.bascule.subscribe(() => nbEmissions++);

    const panneau: HTMLElement = fixture.nativeElement.querySelector('.panneau-notifications');
    panneau.click();

    expect(nbEmissions).toBe(0);
  });

  it("le clic sur le bouton n'émet \"bascule\" qu'une seule fois, même panneau déjà ouvert", () => {
    // Reproduit le scénario signalé : le bouton est À L'INTÉRIEUR de l'élément de la cloche, donc
    // l'écouteur document (clic EXTÉRIEUR) ne doit pas se déclencher en plus et faire émettre deux
    // fois (ce qui annulerait l'ouverture dans le même geste côté parent).
    fixture.componentRef.setInput('panneauOuvert', true);
    fixture.detectChanges();

    let nbEmissions = 0;
    component.bascule.subscribe(() => nbEmissions++);

    const bouton: HTMLButtonElement = fixture.nativeElement.querySelector('.bouton-cloche');
    bouton.click();

    expect(nbEmissions).toBe(1);
  });
});

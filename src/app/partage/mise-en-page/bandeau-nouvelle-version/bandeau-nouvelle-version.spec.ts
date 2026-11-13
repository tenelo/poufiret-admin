import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { BandeauNouvelleVersion } from './bandeau-nouvelle-version';
import { MiseAJourService } from '../../../noyau/mise-a-jour/mise-a-jour.service';

describe('BandeauNouvelleVersion', () => {
  function creer(disponible: boolean) {
    const miseAJourDisponible = signal(disponible);
    const activer = jasmine.createSpy('activer');
    const ignorer = jasmine.createSpy('ignorer');

    TestBed.configureTestingModule({
      imports: [BandeauNouvelleVersion],
      providers: [{ provide: MiseAJourService, useValue: { miseAJourDisponible, activer, ignorer } }],
    });
    const fixture: ComponentFixture<BandeauNouvelleVersion> = TestBed.createComponent(BandeauNouvelleVersion);
    fixture.detectChanges();
    return { fixture, miseAJourDisponible, activer, ignorer };
  }

  it("n'affiche rien quand aucune mise à jour n'est disponible", () => {
    const { fixture } = creer(false);
    expect(fixture.nativeElement.querySelector('.bandeau-nouvelle-version')).toBeNull();
  });

  it('affiche le bandeau quand une mise à jour est disponible', () => {
    const { fixture } = creer(true);
    const bandeau = fixture.nativeElement.querySelector('.bandeau-nouvelle-version');
    expect(bandeau).not.toBeNull();
    expect(bandeau.textContent).toContain('Une nouvelle version est disponible.');
  });

  it('« Mettre à jour » appelle activer() sur le service', () => {
    const { fixture, activer } = creer(true);
    (fixture.nativeElement.querySelector('.bouton-mettre-a-jour') as HTMLButtonElement).click();
    expect(activer).toHaveBeenCalled();
  });

  it('la croix appelle ignorer() sur le service', () => {
    const { fixture, ignorer } = creer(true);
    (fixture.nativeElement.querySelector('.bouton-fermer') as HTMLButtonElement).click();
    expect(ignorer).toHaveBeenCalled();
  });
});

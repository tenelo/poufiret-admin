import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { PartenairesPublicitesAdmin } from './partenaires-publicites-admin';
import { PublicitesAdminService } from '../publicites-admin.service';
import { PartenairePubliciteAdmin, ReponseListePartenairesPubliciteAdmin } from '../../../../modeles/publicites-admin.model';

const PARTENAIRES: PartenairePubliciteAdmin[] = [
  {
    partenaire_id: 42,
    nom_commerce: 'Boulangerie Ferke',
    telephone: '0100000000',
    nb_publicites: 3,
    par_statut: { active: 2, terminee: 1 },
    total_affichages: 120,
    total_clics: 8,
    derniere_pub_le: '2026-02-01',
  },
];

function reponse(results: PartenairePubliciteAdmin[]): ReponseListePartenairesPubliciteAdmin {
  return { count: results.length, next: null, previous: null, results };
}

describe('PartenairesPublicitesAdmin', () => {
  let fixture: ComponentFixture<PartenairesPublicitesAdmin>;
  let serviceFake: { chargerPartenaires: jasmine.Spy };
  let routerFake: { navigate: jasmine.Spy };

  async function creer(results: PartenairePubliciteAdmin[] = PARTENAIRES): Promise<void> {
    serviceFake = { chargerPartenaires: jasmine.createSpy('chargerPartenaires').and.returnValue(of(reponse(results))) };
    routerFake = { navigate: jasmine.createSpy('navigate') };
    await TestBed.configureTestingModule({
      imports: [PartenairesPublicitesAdmin],
      providers: [
        { provide: PublicitesAdminService, useValue: serviceFake },
        { provide: Router, useValue: routerFake },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PartenairesPublicitesAdmin);
    fixture.detectChanges();
  }

  it('charge et affiche la liste au démarrage', async () => {
    await creer();
    expect(serviceFake.chargerPartenaires).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Boulangerie Ferke');
    expect(fixture.nativeElement.textContent).toContain('120');
  });

  it('affiche une pastille par statut présent', async () => {
    await creer();
    const badges = fixture.nativeElement.querySelectorAll('.colonne-statuts .badge');
    expect(badges.length).toBe(2);
  });

  it('clic sur une ligne : navigue vers /administration/publicites filtré sur ce partenaire', async () => {
    await creer();
    (fixture.nativeElement.querySelector('.ligne-partenaire') as HTMLElement).click();
    expect(routerFake.navigate).toHaveBeenCalledWith(['/administration/publicites'], {
      queryParams: { statut: 'toutes', partenaire: 42, partenaireNom: 'Boulangerie Ferke' },
    });
  });

  it('la recherche recharge la liste après un court délai (debounce)', fakeAsync(async () => {
    await creer();
    serviceFake.chargerPartenaires.calls.reset();
    fixture.componentInstance.saisirRecherche('boulangerie');
    tick(400);
    expect(serviceFake.chargerPartenaires).toHaveBeenCalled();
  }));

  it('affiche un état vide quand aucun partenaire ne correspond', async () => {
    await creer([]);
    expect(fixture.nativeElement.textContent).toContain('Aucun partenaire pour ces critères.');
  });
});

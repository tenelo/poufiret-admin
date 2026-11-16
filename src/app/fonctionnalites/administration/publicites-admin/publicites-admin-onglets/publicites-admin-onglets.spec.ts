import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PublicitesAdminOnglets } from './publicites-admin-onglets';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';
import { PublicitesAdminService } from '../publicites-admin.service';

/** Visibilité du nouvel onglet « Pubs Poufiret » (capacité gerer_pubs_poufiret ou super-admin). */
describe('PublicitesAdminOnglets — onglet Pubs Poufiret', () => {
  async function creer(capacites: Record<string, boolean>, isSuperuser = false): Promise<ComponentFixture<PublicitesAdminOnglets>> {
    await TestBed.configureTestingModule({
      imports: [PublicitesAdminOnglets],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: PublicitesAdminService,
          useValue: { chargerStats: () => of({ totaux: {}, publicites: [] }), chargerListe: () => of({ count: 0, next: null, previous: null, results: [] }), chargerQuotasFormules: () => of([]) },
        },
        {
          provide: PermissionsService,
          useValue: {
            permissionsActuelles: () => ({ role: 'admin', isStaff: true, isSuperuser, capacites }),
            aLaCapacite: (nom: string) => capacites[nom] ?? false,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicitesAdminOnglets);
    fixture.detectChanges();
    return fixture;
  }

  function boutons(fixture: ComponentFixture<PublicitesAdminOnglets>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.onglet') as NodeListOf<HTMLButtonElement>).map((b) =>
      b.textContent!.trim(),
    );
  }

  it('masque l’onglet sans la capacité', async () => {
    const fixture = await creer({});
    expect(boutons(fixture)).not.toContain('Pubs Poufiret');
  });

  it('affiche l’onglet avec gerer_pubs_poufiret, et bascule le contenu au clic', async () => {
    const fixture = await creer({ gerer_pubs_poufiret: true });
    expect(boutons(fixture)).toContain('Pubs Poufiret');

    const bouton = Array.from(fixture.nativeElement.querySelectorAll('.onglet') as NodeListOf<HTMLButtonElement>).find(
      (b) => b.textContent!.trim() === 'Pubs Poufiret',
    )!;
    bouton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-pubs-poufiret')).not.toBeNull();
  });

  it('affiche l’onglet pour un super-admin même sans la capacité explicite', async () => {
    const fixture = await creer({}, true);
    expect(boutons(fixture)).toContain('Pubs Poufiret');
  });
});

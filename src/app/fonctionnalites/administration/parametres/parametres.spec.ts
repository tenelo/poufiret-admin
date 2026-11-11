import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Parametres } from './parametres';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { PermissionsAdmin } from '../../../modeles/permissions-admin.model';

/**
 * L'onglet "Locations" (nb_max_images_vitrine, P/admin/parametres/) est réservé au super-admin,
 * sans capacité fine (même traitement que "Modération de comptes") : 403 côté backend sinon.
 */
describe('Parametres', () => {
  async function creerComposant(permissions: PermissionsAdmin): Promise<ComponentFixture<Parametres>> {
    const permissionsServiceFake = {
      permissionsActuelles: () => permissions,
      aLaCapacite: (nom: string) => permissions.capacites[nom] ?? false,
    };

    await TestBed.configureTestingModule({
      imports: [Parametres],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PermissionsService, useValue: permissionsServiceFake },
      ],
    }).compileComponents();

    return TestBed.createComponent(Parametres);
  }

  it("masque l'onglet Locations pour un admin sans droit super-admin", async () => {
    const fixture = await creerComposant({ role: 'admin', isStaff: true, isSuperuser: false, capacites: {} });
    fixture.detectChanges();

    expect(fixture.componentInstance.onglets().some((o) => o.valeur === 'locations')).toBe(false);
  });

  it("affiche l'onglet Locations pour un super-admin", async () => {
    const fixture = await creerComposant({ role: 'admin', isStaff: true, isSuperuser: true, capacites: {} });
    fixture.detectChanges();

    expect(fixture.componentInstance.onglets().some((o) => o.valeur === 'locations')).toBe(true);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PublicitesAdmin } from './publicites-admin';
import { PublicitesAdminService } from './publicites-admin.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { PermissionsAdmin } from '../../../modeles/permissions-admin.model';
import { StatsPublicitesAdmin } from '../../../modeles/publicites-admin.model';

const STATS: StatsPublicitesAdmin = {
  totaux: { nb_publicites: 2 },
  publicites: [
    { id: 'p-terminee', titre: 'Campagne terminée', formule: 'Or', statut: 'terminee' },
    { id: 'p-active', titre: 'Campagne active', formule: 'Or', statut: 'active' },
  ],
};

/** Boutons « Créer une pub pour un partenaire » et « Reconduire » : capacité gerer_pubs_partenaires. */
describe('PublicitesAdmin — pubs créées pour un partenaire', () => {
  async function creer(permissions: PermissionsAdmin): Promise<ComponentFixture<PublicitesAdmin>> {
    const serviceFake = {
      chargerStats: () => of(STATS),
      chargerQuotasFormules: () => of([]),
    };
    await TestBed.configureTestingModule({
      imports: [PublicitesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PublicitesAdminService, useValue: serviceFake },
        {
          provide: PermissionsService,
          useValue: {
            permissionsActuelles: () => permissions,
            aLaCapacite: (nom: string) => permissions.capacites[nom] ?? false,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicitesAdmin);
    fixture.detectChanges();
    return fixture;
  }

  function boutons(fixture: ComponentFixture<PublicitesAdmin>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) =>
      b.textContent!.trim(),
    );
  }

  it('masque « Créer une pub pour un partenaire » et « Reconduire » sans la capacité', async () => {
    const fixture = await creer({ role: 'admin', isStaff: true, isSuperuser: false, capacites: { valider_publicite: true } });
    const textes = boutons(fixture);
    expect(textes.some((t) => t.includes('Créer une pub pour un partenaire'))).toBeFalse();
    expect(textes).not.toContain('Reconduire');
  });

  it('affiche les deux boutons avec gerer_pubs_partenaires ; « Reconduire » seulement sur les terminées', async () => {
    const fixture = await creer({
      role: 'admin',
      isStaff: true,
      isSuperuser: false,
      capacites: { gerer_pubs_partenaires: true },
    });
    const textes = boutons(fixture);
    expect(textes.some((t) => t.includes('Créer une pub pour un partenaire'))).toBeTrue();
    expect(textes.filter((t) => t === 'Reconduire').length).toBe(1);
    const carteTerminee = fixture.nativeElement.querySelector('#pub-p-terminee') as HTMLElement;
    expect(carteTerminee.textContent).toContain('Reconduire');
  });

  it('affiche les boutons pour un super-admin', async () => {
    const fixture = await creer({ role: 'admin', isStaff: true, isSuperuser: true, capacites: {} });
    expect(boutons(fixture).some((t) => t.includes('Créer une pub pour un partenaire'))).toBeTrue();
  });

  it('après succès : message affiché, campagnes et quotas rechargés', async () => {
    const fixture = await creer({ role: 'admin', isStaff: true, isSuperuser: true, capacites: {} });
    const service = TestBed.inject(PublicitesAdminService);
    const stats = spyOn(service, 'chargerStats').and.returnValue(of(STATS));
    const quotas = spyOn(service, 'chargerQuotasFormules').and.returnValue(of([]));

    fixture.componentInstance.ouvrirCreationPubPartenaire();
    fixture.componentInstance.surPubPartenaireReussie('La pub « Pain » a été créée pour Ferke.');
    fixture.detectChanges();

    expect(fixture.componentInstance.dialogPubPartenaire()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La pub « Pain » a été créée pour Ferke.');
    expect(stats).toHaveBeenCalled();
    expect(quotas).toHaveBeenCalled();
  });
});

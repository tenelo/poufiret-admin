import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { OngletGestionPublicites } from './onglet-gestion-publicites';
import { OngletGestionPublicitesService } from './onglet-gestion-publicites.service';
import { MaPublicite } from '../../../../modeles/publicite.model';

function publicite(partielle: Partial<MaPublicite> & { id: string; statut: MaPublicite['statut'] }): MaPublicite {
  return {
    formule: 'f1',
    titre: 'Campagne',
    description: '',
    image_couverture: null,
    video: null,
    portee: 'departement',
    debut_diffusion: null,
    fin_diffusion: null,
    ...partielle,
  };
}

/** Mentions de reconduction (reconduite_le, reconduction_statut, reconduite_depuis_id, peut_etre_reconduite). */
describe('OngletGestionPublicites — reconduction', () => {
  async function creer(publicites: MaPublicite[]): Promise<ComponentFixture<OngletGestionPublicites>> {
    const serviceFake = {
      listerFormules: () => of([]),
      listerMesPublicites: () => of(publicites),
      chargerPorteeForfait: () => of(null),
    };
    await TestBed.configureTestingModule({
      imports: [OngletGestionPublicites],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OngletGestionPublicitesService, useValue: serviceFake },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OngletGestionPublicites);
    fixture.detectChanges();
    return fixture;
  }

  it('masque « Reconduire » quand peut_etre_reconduite est false, même sur une campagne terminée', async () => {
    const fixture = await creer([
      publicite({ id: 'p1', titre: 'Campagne bloquée', statut: 'terminee', peut_etre_reconduite: false }),
    ]);
    const carte = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(carte.textContent).not.toContain('Reconduire');
  });

  it('affiche « Reconduire » sur une campagne terminée reconductible', async () => {
    const fixture = await creer([publicite({ id: 'p1', titre: 'Campagne', statut: 'terminee' })]);
    const carte = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(carte.textContent).toContain('Reconduire');
  });

  it('affiche « Reconduite le… » avec la pastille du statut de la copie', async () => {
    const fixture = await creer([
      publicite({
        id: 'p1',
        titre: 'Campagne reconduite',
        statut: 'terminee',
        reconduite_le: '2026-01-15',
        reconduction_statut: 'active',
      }),
    ]);
    const carte = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(carte.textContent).toContain('Reconduite le 15/01/2026');
    expect(carte.querySelector('.badge-active')?.textContent).toContain('Active');
  });

  it('« ↩ Reconduction » cliquable vers l\'original s\'il est chargé, simple mention sinon', async () => {
    const fixture = await creer([
      publicite({ id: 'original', titre: 'Originale', statut: 'terminee' }),
      publicite({ id: 'copie-chargee', titre: 'Copie (original chargé)', statut: 'active', reconduite_depuis_id: 'original' }),
      publicite({ id: 'copie-isolee', titre: 'Copie (original absent)', statut: 'active', reconduite_depuis_id: 'introuvable' }),
    ]);

    const carteChargee = fixture.nativeElement.querySelector('#pub-copie-chargee') as HTMLElement;
    const lienChargee = carteChargee.querySelector('.lien-reconduction') as HTMLButtonElement | null;
    expect(lienChargee).not.toBeNull();
    expect(lienChargee!.textContent).toContain('Reconduction');

    const carteIsolee = fixture.nativeElement.querySelector('#pub-copie-isolee') as HTMLElement;
    expect(carteIsolee.querySelector('.lien-reconduction')).toBeNull();
    expect(carteIsolee.querySelector('.mention-reconduction')?.textContent).toContain('Reconduction');
  });
});

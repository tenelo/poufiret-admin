import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { BarreFiltresPublicitesAdmin } from './filtres-publicites-admin';
import { FiltresRecherchePublicitesAdmin } from '../../../../modeles/publicites-admin.model';

describe('BarreFiltresPublicitesAdmin', () => {
  let fixture: ComponentFixture<BarreFiltresPublicitesAdmin>;
  let composant: BarreFiltresPublicitesAdmin;
  let emissions: FiltresRecherchePublicitesAdmin[];

  async function creer(entrees: {
    filtresInitiaux?: Partial<FiltresRecherchePublicitesAdmin>;
    partenaireActif?: { id: number; nom: string } | null;
  } = {}): Promise<void> {
    await TestBed.configureTestingModule({ imports: [BarreFiltresPublicitesAdmin] }).compileComponents();
    fixture = TestBed.createComponent(BarreFiltresPublicitesAdmin);
    if (entrees.filtresInitiaux) {
      fixture.componentRef.setInput('filtresInitiaux', {
        statut: 'en_attente_validation',
        recherche: '',
        formule: '',
        portee: '',
        partenaireId: null,
        dateDebut: '',
        dateFin: '',
        origine: [],
        ...entrees.filtresInitiaux,
      });
    }
    if (entrees.partenaireActif !== undefined) {
      fixture.componentRef.setInput('partenaireActif', entrees.partenaireActif);
    }
    composant = fixture.componentInstance;
    emissions = [];
    composant.filtresChange.subscribe((f) => emissions.push(f));
    fixture.detectChanges();
  }

  it('restaure la recherche/formule/portée/dates/origine depuis filtresInitiaux (une seule fois)', async () => {
    await creer({
      filtresInitiaux: { recherche: 'pain', formule: 'f-or', portee: 'region', dateDebut: '2026-01-01', origine: ['payee'] },
    });
    expect(composant.recherche()).toBe('pain');
    expect(composant.formule()).toBe('f-or');
    expect(composant.portee()).toBe('region');
    expect(composant.dateDebut()).toBe('2026-01-01');
    expect(composant.origineCochee('payee')).toBeTrue();
  });

  it('affiche la pastille partenaire et émet partenaireId: null au retrait', async () => {
    await creer({ partenaireActif: { id: 42, nom: 'Boulangerie Ferke' } });
    const pastille = fixture.nativeElement.querySelector('.pastille-partenaire') as HTMLElement;
    expect(pastille.textContent).toContain('Boulangerie Ferke');

    (pastille.querySelector('button') as HTMLButtonElement).click();
    expect(emissions.at(-1)?.partenaireId).toBeNull();
  });

  it('bascule une origine (ajout puis retrait)', async () => {
    await creer();
    composant.basculerOrigine('payee', true);
    expect(emissions.at(-1)?.origine).toEqual(['payee']);

    composant.basculerOrigine('payee', false);
    expect(emissions.at(-1)?.origine).toEqual([]);
  });

  it('réinitialise tout sauf le statut', fakeAsync(async () => {
    await creer({
      filtresInitiaux: { recherche: 'pain', formule: 'f-or', portee: 'region', dateDebut: '2026-01-01', origine: ['payee'] },
    });
    composant.choisirOnglet('active');

    composant.reinitialiser();
    const derniere = emissions.at(-1)!;
    expect(derniere.statut).toBe('active'); // onglet conservé.
    expect(derniere.recherche).toBe('');
    expect(derniere.formule).toBe('');
    expect(derniere.portee).toBe('');
    expect(derniere.dateDebut).toBe('');
    expect(derniere.origine).toEqual([]);
  }));

  it('la recherche est émise après un court délai (debounce)', fakeAsync(async () => {
    await creer();
    composant.saisirRecherche('pizza');
    expect(emissions.length).toBe(0);
    tick(400);
    expect(emissions.at(-1)?.recherche).toBe('pizza');
  }));
});

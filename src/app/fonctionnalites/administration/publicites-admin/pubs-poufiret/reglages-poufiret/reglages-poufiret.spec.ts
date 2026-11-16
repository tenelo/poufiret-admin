import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ReglagesPoufiretComposant } from './reglages-poufiret';
import { PubsPoufiretService } from '../pubs-poufiret.service';
import { ReglagesPoufiret } from '../../../../../modeles/pub-poufiret.model';

const REGLAGES: ReglagesPoufiret = {
  pubs_maison_actives: false,
  frequence_pub_maison: 3,
  duree_affichage_secondes: 5,
  parcours_actif: false,
  version_parcours: 1,
  modifie_le: '2026-01-01T00:00:00Z',
};

describe('ReglagesPoufiretComposant', () => {
  let fixture: ComponentFixture<ReglagesPoufiretComposant>;
  let composant: ReglagesPoufiretComposant;
  let serviceFake: { chargerReglages: jasmine.Spy; modifierReglages: jasmine.Spy };

  async function creer(): Promise<void> {
    serviceFake = {
      chargerReglages: jasmine.createSpy().and.returnValue(of(REGLAGES)),
      modifierReglages: jasmine.createSpy().and.returnValue(of(REGLAGES)),
    };
    await TestBed.configureTestingModule({
      imports: [ReglagesPoufiretComposant],
      providers: [{ provide: PubsPoufiretService, useValue: serviceFake }],
    }).compileComponents();
    fixture = TestBed.createComponent(ReglagesPoufiretComposant);
    composant = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('charge et affiche les réglages', async () => {
    await creer();
    expect(fixture.nativeElement.querySelector('#rp-frequence').value).toBe('3');
    expect(fixture.nativeElement.querySelector('#rp-duree').value).toBe('5');
  });

  it('basculerPubsMaisonActives : optimiste, annule si le serveur refuse', async () => {
    await creer();
    serviceFake.modifierReglages.and.returnValue(throwError(() => new Error('refus')));
    composant.basculerPubsMaisonActives();
    expect(composant.reglages()?.pubs_maison_actives).toBeFalse(); // annulé après l'échec.
    expect(composant.messageErreur()).toBeTruthy();
  });

  it('enregistrerFrequenceEtDuree : rejette une fréquence hors plage sans appeler le serveur', async () => {
    await creer();
    composant.frequence.set(0);
    composant.enregistrerFrequenceEtDuree();
    expect(composant.erreurChamps()['frequence']).toBeTruthy();
    expect(serviceFake.modifierReglages).not.toHaveBeenCalled();
  });

  it('enregistrerFrequenceEtDuree : succès, message affiché', async () => {
    await creer();
    composant.frequence.set(4);
    composant.dureeAffichage.set(6);
    composant.enregistrerFrequenceEtDuree();
    expect(serviceFake.modifierReglages).toHaveBeenCalledWith({ frequencePubMaison: 4, dureeAffichageSecondes: 6 });
    expect(composant.messageSucces()).toBe('Réglages enregistrés.');
  });
});

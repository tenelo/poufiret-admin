import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableauPublicitesAdmin } from './tableau-publicites-admin';
import { PubliciteAdmin } from '../../../../modeles/publicites-admin.model';

const PUB_TERMINEE: PubliciteAdmin = { id: 'p1', titre: 'Campagne A', formule: 'Or', statut: 'terminee' };
const PUB_COPIE: PubliciteAdmin = {
  id: 'p2',
  titre: 'Campagne B',
  formule: 'Or',
  statut: 'active',
  reconduite_depuis_id: 'p1',
};

describe('TableauPublicitesAdmin', () => {
  let fixture: ComponentFixture<TableauPublicitesAdmin>;
  let composant: TableauPublicitesAdmin;

  async function creer(publicites: PubliciteAdmin[], entrees: { peutGerer?: boolean; peutModerer?: boolean } = {}): Promise<void> {
    await TestBed.configureTestingModule({ imports: [TableauPublicitesAdmin] }).compileComponents();
    fixture = TestBed.createComponent(TableauPublicitesAdmin);
    composant = fixture.componentInstance;
    fixture.componentRef.setInput('publicites', publicites);
    fixture.componentRef.setInput('peutGererPubsPartenaires', entrees.peutGerer ?? true);
    fixture.componentRef.setInput('peutModerer', entrees.peutModerer ?? false);
    fixture.componentRef.setInput('peutReconduire', (p: PubliciteAdmin) => p.statut === 'terminee');
    fixture.componentRef.setInput('actionsDisponibles', () => []);
    fixture.componentRef.setInput('formaterDate', (iso: string | null | undefined) => iso ?? '—');
    fixture.componentRef.setInput('originalDisponible', (p: PubliciteAdmin) => publicites.some((x) => x.id === p.reconduite_depuis_id));
    fixture.componentRef.setInput('imageValide', () => false);
    fixture.componentRef.setInput('allerVersOriginal', () => undefined);
    fixture.detectChanges();
  }

  it('affiche une ligne par pub, avec id="pub-<id>"', async () => {
    await creer([PUB_TERMINEE, PUB_COPIE]);
    expect(fixture.nativeElement.querySelector('#pub-p1')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#pub-p2')).not.toBeNull();
  });

  it('affiche « Reconduire » seulement si peutGererPubsPartenaires et peutReconduire', async () => {
    await creer([PUB_TERMINEE], { peutGerer: true });
    const ligne = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(ligne.textContent).toContain('Reconduire');
  });

  it('masque « Reconduire » sans la capacité', async () => {
    await creer([PUB_TERMINEE], { peutGerer: false });
    const ligne = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(ligne.textContent).not.toContain('Reconduire');
  });

  it('émet reconduire au clic sur le bouton', async () => {
    await creer([PUB_TERMINEE], { peutGerer: true });
    const emis = jasmine.createSpy('reconduire');
    composant.reconduire.subscribe(emis);
    (fixture.nativeElement.querySelector('#pub-p1 .bouton-action') as HTMLButtonElement).click();
    expect(emis).toHaveBeenCalledWith(PUB_TERMINEE);
  });

  it('« ↩ Reconduction » cliquable quand l’original est dans la liste reçue', async () => {
    await creer([PUB_TERMINEE, PUB_COPIE]);
    const ligne = fixture.nativeElement.querySelector('#pub-p2') as HTMLElement;
    expect(ligne.querySelector('.lien-reconduction')).not.toBeNull();
  });
});

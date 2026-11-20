import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DetailCommande } from './detail-commande';
import { MesCommandesService } from '../mes-commandes.service';
import { Commande, TransitionPossibleCommande } from '../../../../modeles/commande.model';

function commande(transitions: TransitionPossibleCommande[], lignes: Commande['lignes'] = []): Commande {
  return {
    id: 12,
    numero: 'CMD-12',
    user: 1,
    client_nom: 'Awa',
    client_telephone: '0700000000',
    partenaire: 3,
    partenaire_nom: 'Boulangerie Ferke',
    mode_livraison: 'emporter',
    adresse: null,
    adresse_snapshot: null,
    heure_souhaitee: null,
    statut: 'acceptee',
    raison_refus: null,
    sous_total: '1200',
    frais_livraison: '0',
    total: '1200',
    mode_paiement: 'cash',
    notes_client: null,
    notes_partenaire: null,
    lignes,
    created_at: '2026-11-19T10:00:00Z',
    acceptee_le: null,
    prete_le: null,
    livree_le: null,
    parcours: 'court',
    etapes: ['nouvelle', 'acceptee', 'livree'],
    transitions_possibles: transitions,
  };
}

const LIVRER: TransitionPossibleCommande = { action: 'livree', libelle: 'Marquer livrée', commentaire_obligatoire: false };
const ANNULER: TransitionPossibleCommande = { action: 'annulee', libelle: 'Annuler', commentaire_obligatoire: false };

describe('DetailCommande (partenaire)', () => {
  let fixture: ComponentFixture<DetailCommande>;
  let changerStatut: jasmine.Spy;

  async function creer(c: Commande): Promise<void> {
    changerStatut = jasmine.createSpy('changerStatut').and.returnValue(of(c));
    await TestBed.configureTestingModule({
      imports: [DetailCommande],
      providers: [{ provide: MesCommandesService, useValue: { changerStatut } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailCommande);
    fixture.componentRef.setInput('commande', c);
    fixture.detectChanges();
  }

  function boutonsAction(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.actions-transition button'));
  }

  it('affiche uniquement les boutons de transitions_possibles (plus de « Mettre en préparation »)', async () => {
    await creer(commande([LIVRER, ANNULER]));
    expect(boutonsAction().map((b) => b.textContent!.trim())).toEqual(['Marquer livrée', 'Annuler']);
    expect(fixture.nativeElement.textContent).not.toContain('Mettre en préparation');
  });

  it('aucun bouton quand le serveur n’en propose pas', async () => {
    await creer(commande([]));
    expect(boutonsAction().length).toBe(0);
  });

  it('envoie le statut cible de la transition', async () => {
    await creer(commande([LIVRER]));
    boutonsAction()[0].click();
    expect(changerStatut).toHaveBeenCalledWith(12, 'livree', undefined);
  });

  it('demande confirmation avant d’annuler, comme avant', async () => {
    await creer(commande([ANNULER]));
    boutonsAction()[0].click();
    fixture.detectChanges();
    expect(changerStatut).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirmer « Annuler »');
  });

  it('affiche le format puis les options, sans « [object Object] »', async () => {
    await creer(
      commande([], [
        {
          id: 1,
          article: 5,
          nom_article: 'Pain complet aux céréales',
          variante_nom: '1 000 f',
          supplements: [
            { id: 1, nom: 'Attiéké (offert)', prix: 0, groupe_id: 2, groupe_libelle: 'Garniture' },
            { id: 2, nom: 'Attiéké en plus', prix: 200 },
          ],
          quantite: 1,
          prix_unitaire: '1200',
          prix_ligne: '1200',
          note_speciale: null,
        },
      ]),
    );
    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('1 000 f · Attiéké (offert) · Attiéké en plus');
    expect(texte).not.toContain('[object Object]');
  });

  it('n’affiche aucune ligne de détail quand il n’y a ni format ni option', async () => {
    await creer(
      commande([], [
        {
          id: 1,
          article: 5,
          nom_article: 'Pain',
          variante_nom: '',
          supplements: [],
          quantite: 1,
          prix_unitaire: '500',
          prix_ligne: '500',
          note_speciale: null,
        },
      ]),
    );
    const details = Array.from(fixture.nativeElement.querySelectorAll('.ligne-commande .detail-ligne') as NodeListOf<HTMLElement>)
      .map((p) => p.textContent!.trim());
    expect(details).toEqual(['Prix unitaire : 500 FCFA']);
  });
});

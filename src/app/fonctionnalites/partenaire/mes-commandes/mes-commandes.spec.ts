import { MesCommandes } from './mes-commandes';
import { Commande, TransitionPossibleCommande } from '../../../modeles/commande.model';

/** Actions rapides du tableau : depuis transitions_possibles, sans motif ni confirmation. */
describe('MesCommandes — actions rapides du tableau', () => {
  const actionsInline = (transitions?: TransitionPossibleCommande[]) =>
    MesCommandes.prototype.actionsInlineDisponibles.call({}, { transitions_possibles: transitions } as Commande);

  it('reprend les transitions du serveur, hors refus et annulation', () => {
    const actions = actionsInline([
      { action: 'acceptee', libelle: 'Accepter', commentaire_obligatoire: false },
      { action: 'refusee', libelle: 'Refuser', commentaire_obligatoire: false },
      { action: 'annulee', libelle: 'Annuler', commentaire_obligatoire: false },
    ]);
    expect(actions.map((a) => a.libelle)).toEqual(['Accepter']);
  });

  it('exclut une transition dont le commentaire est obligatoire', () => {
    expect(actionsInline([{ action: 'livree', libelle: 'Marquer livrée', commentaire_obligatoire: true }])).toEqual([]);
  });

  it('aucune action codée en dur quand le serveur n’en renvoie pas', () => {
    expect(actionsInline(undefined)).toEqual([]);
    expect(actionsInline([])).toEqual([]);
  });
});

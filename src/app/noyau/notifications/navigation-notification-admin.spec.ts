import { destinationEcranAdmin, ecranAdminValide } from './navigation-notification-admin';

describe('ecranAdminValide', () => {
  it('reconnaît les 4 écrans connus', () => {
    expect(ecranAdminValide('commandes')).toBe('commandes');
    expect(ecranAdminValide('interventions')).toBe('interventions');
    expect(ecranAdminValide('demandes_location')).toBe('demandes_location');
    expect(ecranAdminValide('publicites')).toBe('publicites');
  });

  it('renvoie null pour un écran absent ou inconnu (ex. clic sur une notification push)', () => {
    expect(ecranAdminValide(null)).toBeNull();
    expect(ecranAdminValide(undefined)).toBeNull();
    expect(ecranAdminValide('')).toBeNull();
    expect(ecranAdminValide('messages')).toBeNull();
  });
});

describe('destinationEcranAdmin', () => {
  it('commandes : préfiltre la catégorie Restaurants seulement si le canal est restaurant', () => {
    expect(destinationEcranAdmin('commandes', 42, { canal: 'restaurant' })).toEqual({
      chemin: ['/administration/commandes'],
      queryParams: { commande: 42, categorie: 'restaurants' },
    });
    expect(destinationEcranAdmin('commandes', 42, { canal: 'general' })).toEqual({
      chemin: ['/administration/commandes'],
      queryParams: { commande: 42, categorie: undefined },
    });
    // Clic sur une notification push : ni canal ni statut connus.
    expect(destinationEcranAdmin('commandes', '42')).toEqual({
      chemin: ['/administration/commandes'],
      queryParams: { commande: '42', categorie: undefined },
    });
  });

  it('interventions', () => {
    expect(destinationEcranAdmin('interventions', 7)).toEqual({
      chemin: ['/administration/interventions'],
      queryParams: { intervention: 7 },
    });
  });

  it('demandes_location', () => {
    expect(destinationEcranAdmin('demandes_location', 9)).toEqual({
      chemin: ['/administration/demandes-location'],
      queryParams: { demande: 9 },
    });
  });

  it('publicites : statut seulement si fourni (connu uniquement depuis la liste de notifications)', () => {
    expect(destinationEcranAdmin('publicites', 'uuid-1', { statutPublicite: 'en_attente_paiement' })).toEqual({
      chemin: ['/administration/publicites'],
      queryParams: { statut: 'en_attente_paiement', pub: 'uuid-1' },
    });
    expect(destinationEcranAdmin('publicites', 'uuid-1')).toEqual({
      chemin: ['/administration/publicites'],
      queryParams: { statut: undefined, pub: 'uuid-1' },
    });
  });
});

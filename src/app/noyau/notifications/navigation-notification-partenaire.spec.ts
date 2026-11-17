import { destinationEcranPartenaire, ecranPartenaireValide } from './navigation-notification-partenaire';

describe('ecranPartenaireValide', () => {
  it('reconnaît commandes et demandes', () => {
    expect(ecranPartenaireValide('commandes')).toBe('commandes');
    expect(ecranPartenaireValide('demandes')).toBe('demandes');
  });

  it('renvoie null pour « messages » (pas encore d’écran dédié côté partenaire) ou un écran absent', () => {
    expect(ecranPartenaireValide('messages')).toBeNull();
    expect(ecranPartenaireValide(null)).toBeNull();
    expect(ecranPartenaireValide(undefined)).toBeNull();
  });
});

describe('destinationEcranPartenaire', () => {
  it('commandes', () => {
    expect(destinationEcranPartenaire('commandes', 12)).toEqual({
      chemin: ['/mes-commandes'],
      queryParams: { commande: 12 },
    });
  });

  it('demandes', () => {
    expect(destinationEcranPartenaire('demandes', 5)).toEqual({
      chemin: ['/mes-demandes'],
      queryParams: { demande: 5 },
    });
  });
});

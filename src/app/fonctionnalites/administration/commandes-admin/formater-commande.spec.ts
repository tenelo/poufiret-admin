import { noteDetailsLigne, texteDetailsLigne, texteFormatEtOptions } from './formater-commande';

describe('formater-commande — format et options d’une ligne', () => {
  it('affiche le format puis les options, séparés par « · »', () => {
    expect(
      texteFormatEtOptions('1 000 f', [
        { id: 1, nom: 'Attiéké (offert)', prix: 0, groupe_id: 3, groupe_libelle: 'Garniture' },
        { id: 2, nom: 'Attiéké en plus', prix: 200 },
      ]),
    ).toBe('1 000 f · Attiéké (offert) · Attiéké en plus');
  });

  it('ne renvoie rien quand il n’y a ni format ni option', () => {
    expect(texteFormatEtOptions(null, [])).toBe('');
    expect(texteFormatEtOptions('', null)).toBe('');
    expect(texteFormatEtOptions(undefined, undefined)).toBe('');
  });

  it('options seules ou format seul', () => {
    expect(texteFormatEtOptions(null, [{ nom: 'Piment' }])).toBe('Piment');
    expect(texteFormatEtOptions('Grand', [])).toBe('Grand');
  });

  it('n’affiche jamais « [object Object] »', () => {
    const texte = texteFormatEtOptions({ id: 4 }, [{ id: 9, prix: 100 }, { libelle: 'Sauce' }]);
    expect(texte).not.toContain('[object Object]');
    expect(texte).toBe('Sauce');
  });

  it('lit l’objet `details` des lignes admin, et sa note', () => {
    const details = { variante: '1 000 f', supplements: [{ nom: 'Attiéké en plus', prix: 200 }], note_speciale: 'Bien cuit' };
    expect(texteDetailsLigne(details)).toBe('1 000 f · Attiéké en plus');
    expect(noteDetailsLigne(details)).toBe('Bien cuit');
    expect(texteDetailsLigne({ variante: null, supplements: [], note_speciale: '' })).toBe('');
  });

  it('garde un `details` texte (ancien format) tel quel', () => {
    expect(texteDetailsLigne('Sans oignon')).toBe('Sans oignon');
    expect(texteDetailsLigne(null)).toBe('');
    expect(noteDetailsLigne('Sans oignon')).toBe('');
  });
});

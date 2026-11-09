/** Montant en francs CFA abrégé, ex. « 25 000 F » (cartes véhicules et hébergements, demandes). */
export function formaterFrancs(valeur: number | null | undefined): string {
  return `${Math.round(valeur ?? 0).toLocaleString('fr-FR')} F`;
}

/** Type de bien d'une demande (objet_type) : « Véhicule », « Hébergement » ou « Logement » (défaut). */
export function libelleTypeBien(objetType: string | null | undefined): string {
  if (objetType === 'vehicule') return 'Véhicule';
  if (objetType === 'hebergement') return 'Hébergement';
  return 'Logement';
}

/** Nombre de nuits entre l'arrivée et le départ (dates AAAA-MM-JJ), null si incomplet. */
export function nombreNuits(debut: string | null | undefined, fin: string | null | undefined): number | null {
  if (!debut || !fin) return null;
  const nuits = Math.round((Date.parse(fin) - Date.parse(debut)) / 86_400_000);
  return Number.isNaN(nuits) || nuits < 0 ? null : nuits;
}

/** Modes de transaction incluant la vente (apps.locations.vente.MODES_VENTE, backend). */
export const MODES_VENTE = ['vente', 'location_vente'];

/** Vrai si l'annonce (logement ou véhicule) est à vendre (vente ou location_vente). */
export function estAVendre(bien: { mode?: string | null }): boolean {
  return !!bien.mode && MODES_VENTE.includes(bien.mode);
}

/** « Vendues »/« En vente » : valeurs fixées par le contrat (POST .../vendu/ {vendu: true|false}). */
export const OPTIONS_VENDU: { valeur: string; libelle: string }[] = [
  { valeur: '0', libelle: 'En vente' },
  { valeur: '1', libelle: 'Vendues' },
];

/** Occupation d'une demande d'hébergement : « 2 adultes · 1 enfant · 1 unité » (vide si rien). */
export function occupationHebergement(d: {
  nb_adultes?: number | null;
  nb_enfants?: number | null;
  nb_unites?: number | null;
}): string {
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const parties: string[] = [];
  if (d.nb_adultes) parties.push(pluriel(d.nb_adultes, 'adulte'));
  if (d.nb_enfants) parties.push(pluriel(d.nb_enfants, 'enfant'));
  if (d.nb_unites) parties.push(pluriel(d.nb_unites, 'unité'));
  return parties.join(' · ');
}

/** Montant en francs CFA abrégé, ex. « 25 000 F » (cartes véhicules, demandes). */
export function formaterFrancs(valeur: number | null | undefined): string {
  return `${Math.round(valeur ?? 0).toLocaleString('fr-FR')} F`;
}

/** Type de bien d'une demande (objet_type) : « Véhicule » ou « Logement » (défaut). */
export function libelleTypeBien(objetType: string | null | undefined): string {
  return objetType === 'vehicule' ? 'Véhicule' : 'Logement';
}

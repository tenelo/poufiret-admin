/**
 * Reflète GET /livraison/bureau/livreurs/. Modèle local au module livraison
 * (isolation).
 */

export type StatutLivreur = 'en_ligne' | 'hors_ligne';
export type TypeVehicule = 'moto' | 'voiture';

export interface LivreurBureau {
  id: string;
  nom: string;
  telephone: string;
  type_vehicule: TypeVehicule;
  statut: StatutLivreur;
  latitude: number | null;
  longitude: number | null;
  position_maj_le: string | null;
  // Présent uniquement côté coordonnateur (roster multi-villes) ; absent
  // (implicitement la ville du bureau) côté bureau.
  ville?: number;
}

export const OPTIONS_STATUT_LIVREUR: { valeur: StatutLivreur | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'en_ligne', libelle: 'En ligne' },
  { valeur: 'hors_ligne', libelle: 'Hors ligne' },
];

export function iconeVehicule(type: TypeVehicule): string {
  return type === 'voiture' ? '🚗' : '🏍️';
}

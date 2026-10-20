/**
 * Reflète GET /api/v1/restaurants/meta/gabarits/ : un gabarit par famille d'établissement
 * (restaurant, boulangerie, pharmacie, mode, librairie, generique). Il pilote l'espace
 * établissement (ex-espace restaurant) : libellés, onglet Menus, groupes d'options et champs
 * spécifiques des produits (« fiche_specifique »).
 */

export type CodeGabarit = 'restaurant' | 'boulangerie' | 'pharmacie' | 'mode' | 'librairie' | 'generique';

export type TypeChampGabarit = 'texte' | 'entier' | 'booleen' | 'choix';

export interface ChoixChampGabarit {
  valeur: string;
  libelle: string;
}

export interface ChampGabarit {
  cle: string;
  libelle: string;
  type: TypeChampGabarit;
  choix?: ChoixChampGabarit[];
  obligatoire: boolean;
}

export interface Gabarit {
  /** Code du gabarit (clé de la réponse meta). */
  code: string;
  libelle: string;
  libelle_section: string;
  libelle_produit: string;
  libelle_variantes: string;
  menus_actifs: boolean;
  options_actives: boolean;
  pagination_publique: boolean;
  champs: ChampGabarit[];
}

/**
 * Repli tant que la meta n'est pas chargée (ou si elle échoue, ou si le code est inconnu) :
 * l'espace se comporte exactement comme l'ancien espace restaurant.
 */
export const GABARIT_RESTAURANT_PAR_DEFAUT: Gabarit = {
  code: 'restaurant',
  libelle: 'Restaurant',
  libelle_section: 'Section',
  libelle_produit: 'Plat',
  libelle_variantes: 'Variantes',
  menus_actifs: true,
  options_actives: true,
  pagination_publique: false,
  champs: [],
};

/** Filtre de la liste admin des établissements (libellés fixés par la spécification). */
export const OPTIONS_FILTRE_GABARIT: { valeur: string; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'restaurant', libelle: 'Restaurants' },
  { valeur: 'boulangerie', libelle: 'Boulangeries' },
  { valeur: 'pharmacie', libelle: 'Pharmacies' },
  { valeur: 'mode', libelle: 'Mode' },
  { valeur: 'librairie', libelle: 'Librairies' },
];

/** Pluriel simple d'un libellé de la meta (« Rayon » → « Rayons », « Prix » inchangé). */
export function pluriel(libelle: string): string {
  return /[sxz]$/i.test(libelle) ? libelle : `${libelle}s`;
}

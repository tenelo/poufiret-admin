/**
 * Reflète GET /api/v1/restaurants/meta/gabarits/ : un gabarit par famille d'établissement
 * (restaurant, boulangerie, pharmacie, mode, librairie, generique). Il pilote l'espace
 * établissement (ex-espace restaurant) : libellés, onglet Menus, groupes d'options et champs
 * spécifiques des produits (« fiche_specifique »).
 */

export type CodeGabarit = 'restaurant' | 'boulangerie' | 'pharmacie' | 'mode' | 'librairie' | 'elevage' | 'generique';

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
 * Repli d'un restaurant (ou d'un gabarit absent) tant que la meta n'est pas chargée, ou si elle
 * échoue : l'espace se comporte exactement comme l'ancien espace restaurant. Un commerce dont le
 * gabarit est connu mais absent de la meta prend gabaritCommerceParDefaut (jamais de menus).
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

/**
 * Repli d'un gabarit de commerce absent de la meta (code connu mais pas encore servi) : jamais
 * de menus ni d'options, libellés neutres. Le code et le libellé sont ceux du partenaire.
 */
export function gabaritCommerceParDefaut(code: string): Gabarit {
  return {
    code,
    libelle: LIBELLES_GABARIT[code] ?? 'Commerce',
    libelle_section: 'Section',
    libelle_produit: 'Produit',
    libelle_variantes: 'Variantes',
    menus_actifs: false,
    options_actives: false,
    pagination_publique: true,
    champs: [],
  };
}

/** Libellés de repli des gabarits (pastilles des listes) quand la meta ne les fournit pas. */
export const LIBELLES_GABARIT: Record<string, string> = {
  restaurant: 'Restaurant',
  boulangerie: 'Boulangerie',
  pharmacie: 'Pharmacie',
  mode: 'Mode',
  librairie: 'Librairie',
  elevage: 'Élevage',
  generique: 'Commerce',
};

/**
 * Gabarits codés d'après le contrat, utilisés tant que la meta réelle ne les contient pas
 * (backend développé en parallèle). Dès que la meta les sert, ce sont ses valeurs qui priment.
 */
export const GABARITS_CONTRAT: Record<string, Gabarit> = {
  elevage: {
    code: 'elevage',
    libelle: 'Élevage',
    libelle_section: 'Catégorie',
    libelle_produit: 'Animal / Produit',
    libelle_variantes: 'Variantes',
    menus_actifs: false,
    options_actives: false,
    pagination_publique: true,
    champs: [
      { cle: 'espece', libelle: 'Espèce', type: 'texte', obligatoire: false },
      {
        cle: 'etat_vente',
        libelle: 'État à la vente',
        type: 'choix',
        obligatoire: false,
        choix: [
          { valeur: 'vivant', libelle: 'Vivant' },
          { valeur: 'abattu', libelle: 'Abattu / prêt à cuire' },
          { valeur: 'produit', libelle: 'Produit (œufs, lait…)' },
        ],
      },
      {
        cle: 'unite_prix',
        libelle: 'Unité de prix',
        type: 'choix',
        obligatoire: false,
        choix: [
          { valeur: 'tete', libelle: 'Par tête' },
          { valeur: 'kg', libelle: 'Au kilo' },
          { valeur: 'unite', libelle: "À l'unité" },
          { valeur: 'lot', libelle: 'Par lot' },
        ],
      },
      { cle: 'poids_moyen_kg', libelle: 'Poids moyen (kg)', type: 'entier', obligatoire: false },
      { cle: 'age', libelle: 'Âge', type: 'texte', obligatoire: false },
      { cle: 'quantite_disponible', libelle: 'Quantité disponible', type: 'entier', obligatoire: false },
      { cle: 'commande_avance_jours', libelle: "Commande à l'avance (jours)", type: 'entier', obligatoire: false },
      { cle: 'livraison_possible', libelle: 'Livraison possible', type: 'booleen', obligatoire: false },
    ],
  },
};

/** Gabarit déduit du type de partenaire, en dernier recours (détail et liste sans "gabarit"). */
export function gabaritDuTypePartenaire(type: string | null | undefined): string | null {
  const correspondance: Record<string, string> = {
    restaurateur: 'restaurant',
    fast_food: 'restaurant',
    boulanger: 'boulangerie',
    pharmacien: 'pharmacie',
    boutique_mode: 'mode',
    libraire: 'librairie',
    eleveur: 'elevage',
  };
  return (type && correspondance[type]) || null;
}

/** Filtre de la liste admin des établissements (libellés fixés par la spécification). */
export const OPTIONS_FILTRE_GABARIT: { valeur: string; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'restaurant', libelle: 'Restaurants' },
  { valeur: 'boulangerie', libelle: 'Boulangeries' },
  { valeur: 'pharmacie', libelle: 'Pharmacies' },
  { valeur: 'mode', libelle: 'Mode' },
  { valeur: 'librairie', libelle: 'Librairies' },
  { valeur: 'elevage', libelle: 'Élevage' },
];

/**
 * Pluriel simple d'un libellé de la meta, mot par mot autour d'un « / » : « Rayon » → « Rayons »,
 * « Animal / Produit » → « Animaux / Produits », « Prix » inchangé.
 */
export function pluriel(libelle: string): string {
  return libelle
    .split(' / ')
    .map((mot) => {
      if (/[sxz]$/i.test(mot)) return mot;
      if (/al$/i.test(mot)) return `${mot.slice(0, -2)}aux`;
      return `${mot}s`;
    })
    .join(' / ');
}

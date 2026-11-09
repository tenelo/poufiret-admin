/**
 * Reflète GET /api/v1/locations/meta/ (lecture seule) : référentiels des logements, véhicules et hébergements —
 * alimente toutes les listes déroulantes et puces des écrans Locations.
 */

export interface OptionLocationMeta {
  valeur: string;
  libelle: string;
}

/** Description d'un champ de vente (apps.locations.vente.meta_vente, affichage conditionnel). */
export interface ChampVenteMeta {
  cle: string;
  libelle: string;
  type: 'choix' | 'entier' | 'booleen' | 'date';
  choix: OptionLocationMeta[];
  obligatoire: boolean;
  defaut?: string | boolean;
  /** Champ visible seulement si `champ` vaut une des `valeurs` (ex. mode = vente ou location_vente). */
  visible_si: { champ: string; valeurs: string[] } | null;
}

export interface ReponseLocationMeta {
  types_logement: OptionLocationMeta[];
  equipements: OptionLocationMeta[];
  disponibilites: OptionLocationMeta[];
  // Véhicules (V1) : optionnels tant que le backend n'est pas déployé partout.
  categories_vehicule?: OptionLocationMeta[];
  boites?: OptionLocationMeta[];
  carburants?: OptionLocationMeta[];
  equipements_vehicule?: OptionLocationMeta[];
  // Hôtels & résidences (V2).
  types_etablissement?: OptionLocationMeta[];
  types_hebergement?: OptionLocationMeta[];
  equipements_etablissement?: OptionLocationMeta[];
  equipements_hebergement?: OptionLocationMeta[];
  petit_dejeuner?: OptionLocationMeta[];
  // Vente des logements et véhicules (apps.locations.vente) : modes, états, documents de propriété
  // et description des champs de formulaire avec affichage conditionnel (visible_si).
  modes?: OptionLocationMeta[];
  etats_vehicule?: OptionLocationMeta[];
  types_document?: OptionLocationMeta[];
  champs_vente?: { vehicule: ChampVenteMeta[]; logement: ChampVenteMeta[] };
}

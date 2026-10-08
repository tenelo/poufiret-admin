/**
 * Reflète GET /api/v1/locations/meta/ (lecture seule) : référentiels des logements, véhicules et hébergements —
 * alimente toutes les listes déroulantes et puces des écrans Locations.
 */

export interface OptionLocationMeta {
  valeur: string;
  libelle: string;
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
}

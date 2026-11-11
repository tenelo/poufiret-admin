/**
 * Reflète /api/v1/locations/mon-espace/vitrine/... (hôtelier) et
 * /api/v1/locations/admin/<partenaire_id>/vitrine/... (admin, capacité gerer_locations, même
 * interface — voir LocationService) : la vitrine d'un hôtel ou d'une résidence, courte liste
 * ordonnée d'images qui alimente le carrousel de la fiche établissement dans l'app mobile.
 */

export type SourceImageVitrine = 'hebergement' | 'propre';

export interface ImageVitrine {
  id: string;
  source: SourceImageVitrine;
  url: string;
  legende: string | null;
  ordre: number;
  /** Id de l'image d'hébergement d'origine (source "hebergement"), null pour une photo propre. */
  image_hebergement_id: number | null;
  hebergement_id: number | null;
  hebergement_nom: string | null;
  cree_le: string;
  modifie_le: string;
}

/** Photo d'un hébergement (chambre) pouvant être ajoutée à la vitrine ("Choisir parmi mes photos"). */
export interface PhotoDisponibleVitrine {
  id: number;
  url: string;
  hebergement_id: number | null;
  hebergement_nom: string | null;
  est_principale: boolean;
  dans_vitrine: boolean;
}

export interface Vitrine {
  nb_max_images: number;
  nb_images: number;
  images: ImageVitrine[];
  photos_disponibles: PhotoDisponibleVitrine[];
}

export interface RequeteAjoutImageVitrineExistante {
  image_hebergement: number;
  legende?: string;
}

// ---- Paramètre global (admin/parametres/, super-admin seulement) ----

export interface ParametresVitrine {
  id: number;
  nb_max_images_vitrine: number;
  modifie_le: string;
}

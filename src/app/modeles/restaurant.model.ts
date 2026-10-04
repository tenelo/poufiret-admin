/**
 * Reflète la fiche, les horaires et les téléphones d'un restaurant
 * (/api/v1/restaurants/mon-restaurant/... côté restaurateur,
 * /api/v1/restaurants/admin/<partenaire_id>/... côté admin — même forme de réponse des deux côtés).
 */

export type ServiceRestaurant = 'sur_place' | 'emporter' | 'livraison';

export const OPTIONS_SERVICE_RESTAURANT: { valeur: ServiceRestaurant; libelle: string }[] = [
  { valeur: 'sur_place', libelle: 'Sur place' },
  { valeur: 'emporter', libelle: 'À emporter' },
  { valeur: 'livraison', libelle: 'Livraison' },
];

/** ⚠ jour_semaine des HORAIRES : 0 à 6, 0 = lundi (différent des menus, voir menu-restaurant.model.ts). */
export const JOURS_HORAIRE: { valeur: number; libelle: string }[] = [
  { valeur: 0, libelle: 'Lundi' },
  { valeur: 1, libelle: 'Mardi' },
  { valeur: 2, libelle: 'Mercredi' },
  { valeur: 3, libelle: 'Jeudi' },
  { valeur: 4, libelle: 'Vendredi' },
  { valeur: 5, libelle: 'Samedi' },
  { valeur: 6, libelle: 'Dimanche' },
];

export interface HoraireJour {
  jour_semaine: number;
  ouvert: boolean;
  heure_ouverture: string | null;
  heure_fermeture: string | null;
  pause_debut: string | null;
  pause_fin: string | null;
  note: string | null;
}

/** Corps de PUT .../horaires/ : toujours les 7 jours. */
export interface RequeteHoraires {
  horaires: HoraireJour[];
}

export interface TelephoneRestaurant {
  id: number;
  libelle: string;
  numero: string;
  ordre: number;
}

export type RequeteTelephone = Omit<TelephoneRestaurant, 'id'>;

/** Traçabilité commune à la fiche, aux plats et aux menus. */
export interface Tracabilite {
  modifie_par_role: 'admin' | 'restaurateur' | null;
  modifie_par_nom: string | null;
  modifie_le: string | null;
}

export interface FicheRestaurant extends Tracabilite {
  ferme_exceptionnellement: boolean;
  motif_fermeture: string | null;
  ferme_jusqu_au: string | null;
  services: ServiceRestaurant[];
  delai_preparation_min: number | null;
  adresse_reperes: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  specialites: string[];
  // Lecture seule.
  est_ouvert: boolean;
  prochaine_ouverture: string | null;
  message_statut: string;
  horaires: HoraireJour[];
  telephones: TelephoneRestaurant[];
}

/** Corps de PATCH .../fiche/ : sous-ensemble modifiable. */
export type RequeteFiche = Partial<
  Pick<
    FicheRestaurant,
    | 'ferme_exceptionnellement'
    | 'motif_fermeture'
    | 'ferme_jusqu_au'
    | 'services'
    | 'delai_preparation_min'
    | 'adresse_reperes'
    | 'facebook'
    | 'instagram'
    | 'tiktok'
    | 'specialites'
  >
>;

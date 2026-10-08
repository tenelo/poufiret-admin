/**
 * Reflète /api/v1/locations/mon-espace/... (hôtelier) et /api/v1/locations/admin/<partenaire_id>/...
 * (admin, même interface — voir LocationService) : l'établissement (fiche unique, GET/PATCH) et ses
 * hébergements (chambres, suites, studios… à la nuit). Champs communs aux biens : voir BienLocation.
 */

import { BienLocation, DisponibiliteBien } from './bien-location.model';

// ---- Établissement (P/etablissement/) ----

export interface Etablissement {
  type_etablissement: string;
  type_etablissement_libelle?: string;
  etoiles: number | null;
  /** "HH:MM" (ou "HH:MM:SS" selon le backend). */
  heure_arrivee: string | null;
  heure_depart: string | null;
  equipements_etablissement: string[];
  petit_dejeuner: string;
  petit_dejeuner_libelle?: string;
  prix_petit_dejeuner: number | null;
  politique_annulation: string;
  conditions: string;
  modifie_par_role?: 'admin' | 'loueur' | null;
  modifie_par_nom?: string | null;
  modifie_le?: string | null;
}

export type RequeteEtablissement = Partial<
  Omit<
    Etablissement,
    'type_etablissement_libelle' | 'petit_dejeuner_libelle' | 'modifie_par_role' | 'modifie_par_nom' | 'modifie_le'
  >
>;

// ---- Hébergements (P/hebergements/) ----

export interface Hebergement extends BienLocation {
  /** Prix par nuit. */
  prix: number;
  type_hebergement: string;
  type_hebergement_libelle?: string;
  capacite_adultes: number | null;
  capacite_enfants: number | null;
  lits: string;
  surface_m2: number | null;
  equipements_hebergement: string[];
  prix_semaine: number | null;
  prix_mois: number | null;
  /** Nombre de chambres identiques proposées à la réservation. */
  nb_unites: number | null;
  duree_min_nuits: number | null;
}

// Corps de POST/PATCH P/hebergements/ : seuls nom et prix sont requis à la création.
export interface RequeteHebergement {
  nom?: string;
  prix?: number;
  description?: string;
  est_actif?: boolean;
  type_hebergement?: string;
  capacite_adultes?: number | null;
  capacite_enfants?: number | null;
  lits?: string;
  surface_m2?: number | null;
  equipements_hebergement?: string[];
  prix_semaine?: number | null;
  prix_mois?: number | null;
  nb_unites?: number | null;
  duree_min_nuits?: number | null;
  disponibilite?: DisponibiliteBien;
}

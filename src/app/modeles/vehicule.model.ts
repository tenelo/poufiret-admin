/**
 * Reflète /api/v1/locations/mon-espace/vehicules/... (loueur de voiture) et
 * /api/v1/locations/admin/<partenaire_id>/vehicules/... (admin, même interface — voir
 * LocationService). Champs communs aux biens : voir BienLocation.
 */

import { BienLocation, DisponibiliteBien } from './bien-location.model';

export interface Vehicule extends BienLocation {
  categorie_vehicule: string;
  categorie_vehicule_libelle?: string;
  marque: string;
  modele: string;
  annee: number | null;
  couleur: string;
  nb_places: number | null;
  boite: string;
  boite_libelle?: string;
  carburant: string;
  carburant_libelle?: string;
  climatisation: boolean;
  equipements: string[];
  chauffeur_disponible: boolean;
  chauffeur_obligatoire: boolean;
  prix_jour_avec_chauffeur: number | null;
  caution: number | null;
  /** 0 = kilométrage illimité. */
  km_inclus_par_jour: number | null;
  prix_km_supplementaire: number | null;
  carburant_inclus: boolean;
  duree_min_jours: number | null;
  zone_circulation: string;
  departement_id: number | null;
  departement_nom: string | null;
  localite_id: number | null;
  localite_nom: string | null;
  quartier_id: number | null;
  quartier_nom: string | null;
  secteur: string;
  adresse_reperes: string;
  latitude: number | null;
  longitude: number | null;
}

// Corps de POST/PATCH P/vehicules/ : seuls nom et prix sont requis à la création.
export interface RequeteVehicule {
  nom?: string;
  prix?: number;
  description?: string;
  est_actif?: boolean;
  categorie_vehicule?: string;
  marque?: string;
  modele?: string;
  annee?: number | null;
  couleur?: string;
  nb_places?: number | null;
  boite?: string;
  carburant?: string;
  climatisation?: boolean;
  equipements?: string[];
  chauffeur_disponible?: boolean;
  chauffeur_obligatoire?: boolean;
  prix_jour_avec_chauffeur?: number | null;
  caution?: number | null;
  km_inclus_par_jour?: number | null;
  prix_km_supplementaire?: number | null;
  carburant_inclus?: boolean;
  duree_min_jours?: number | null;
  zone_circulation?: string;
  disponibilite?: DisponibiliteBien;
  localite_id?: number | null;
  quartier_id?: number | null;
  secteur?: string;
  adresse_reperes?: string;
  latitude?: number | null;
  longitude?: number | null;
}

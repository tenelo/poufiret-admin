/**
 * Reflète /api/v1/locations/mon-espace/... (loueur) et /api/v1/locations/admin/<partenaire_id>/...
 * (admin, même interface — voir LocationService) : fiches de logements à louer, leurs images et
 * panoramas de visite immersive.
 */

export interface ImageLogement {
  id: number;
  image: string;
  legende: string | null;
  est_principale: boolean;
  ordre: number;
}

export type TypeVuePanorama = 'photo_360' | 'panoramique';

export interface PanoramaLogement {
  id: number;
  image: string;
  titre: string;
  type_vue: TypeVuePanorama;
  ordre: number;
}

export type DisponibiliteLogement = string;

export interface Logement {
  id: number;
  nom: string;
  slug: string;
  description: string;
  prix: number;
  est_actif: boolean;
  type_logement: string;
  type_logement_libelle: string;
  nb_chambres: number | null;
  nb_salons: number | null;
  nb_salles_de_bain: number | null;
  surface_m2: number | null;
  meuble: boolean;
  caution_mois: number | null;
  avance_mois: number | null;
  frais_agence: number | null;
  compteur_eau_individuel: boolean;
  compteur_electricite_individuel: boolean;
  equipements: string[];
  disponibilite: DisponibiliteLogement;
  disponibilite_libelle: string;
  disponible_a_partir_du: string | null;
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
  images: ImageLogement[];
  panoramas: PanoramaLogement[];
  modifie_par_role: 'admin' | 'loueur' | null;
  modifie_par_nom: string | null;
  modifie_le: string | null;
  cree_le: string;
}

// Corps de POST/PATCH P/logements/ : seuls nom et prix sont requis à la création.
export interface RequeteLogement {
  nom?: string;
  prix?: number;
  type_logement?: string;
  description?: string;
  est_actif?: boolean;
  nb_chambres?: number | null;
  nb_salons?: number | null;
  nb_salles_de_bain?: number | null;
  surface_m2?: number | null;
  meuble?: boolean;
  caution_mois?: number | null;
  avance_mois?: number | null;
  frais_agence?: number | null;
  compteur_eau_individuel?: boolean;
  compteur_electricite_individuel?: boolean;
  equipements?: string[];
  disponible_a_partir_du?: string | null;
  localite_id?: number | null;
  quartier_id?: number | null;
  secteur?: string;
  adresse_reperes?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RequeteDisponibiliteLogement {
  disponibilite: DisponibiliteLogement;
}

export interface ReponseLogements {
  resultats: Logement[];
}

// ---- Liste admin des loueurs (GET /api/v1/locations/admin/) ----

export interface LoueurAdminListe {
  id: number;
  nom: string;
  /** loueur_maison | loueur_voiture. */
  type_partenaire: string;
  departement_nom: string | null;
  nb_disponibles: number;
  nb_reserves: number;
  nb_loues: number;
  demandes_en_attente: number;
}

export interface ReponseLoueursAdmin {
  resultats: LoueurAdminListe[];
}

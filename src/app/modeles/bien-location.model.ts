/**
 * Socle commun des biens « à la journée/nuit » de l'espace loueur (véhicules V1, hébergements V2) :
 * champs partagés par les cartes, le changement rapide de disponibilité, l'interrupteur Actif et
 * la liste des réservations confirmées (voir OngletBiensBase / DialogBienBase).
 */

import { ImageLogement, PanoramaLogement } from './logement.model';

/** disponible | indisponible (contrat V1/V2). */
export type DisponibiliteBien = string;

export interface ReservationConfirmeeBien {
  demande_id: number;
  date_debut: string;
  date_fin: string;
  /** Hébergements uniquement : nombre d'unités réservées. */
  nb_unites?: number | null;
}

export interface BienLocation {
  id: number;
  nom: string;
  slug?: string;
  prix: number;
  description: string;
  est_actif: boolean;
  equipements?: string[];
  disponibilite: DisponibiliteBien;
  disponibilite_libelle?: string;
  images: ImageLogement[];
  panoramas: PanoramaLogement[];
  reservations_confirmees: ReservationConfirmeeBien[];
  modifie_par_role: 'admin' | 'loueur' | null;
  modifie_par_nom: string | null;
  modifie_le: string | null;
  cree_le: string;
}

export interface RequeteDisponibiliteBien {
  disponibilite: DisponibiliteBien;
}

/** Valeurs de disponibilité d'un véhicule ou d'un hébergement, fixées par le contrat. */
export const OPTIONS_DISPONIBILITE_BIEN: { valeur: DisponibiliteBien; libelle: string }[] = [
  { valeur: 'disponible', libelle: 'Disponible' },
  { valeur: 'indisponible', libelle: 'Indisponible' },
];

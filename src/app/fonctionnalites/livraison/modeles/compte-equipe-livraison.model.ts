/**
 * Comptes d'équipe TeneLivr d'une ville (superviseurs/gestionnaires/livreurs),
 * gérés depuis l'espace coordonnateur (et gestionnaire/superviseur pour les
 * livreurs). Modèles locaux au module livraison (isolation).
 *
 * Le contrat backend confirme les champs de création (POST) ; les champs de
 * liste (GET) pour superviseurs/gestionnaires ne sont pas détaillés au-delà
 * de ce que l'écran doit afficher (nom, téléphone, nom du bureau) — les
 * modèles restent donc volontairement tolérants (prenom/nom ou nom_complet).
 */

import { StatutLivreur, TypeVehicule } from './livreur-bureau.model';

interface CompteEquipeBase {
  id: number;
  telephone: string;
  prenom?: string;
  nom?: string;
  nom_complet?: string;
  nom_bureau?: string;
  ville?: number;
}

export type SuperviseurCompte = CompteEquipeBase;
export type GestionnaireCompte = CompteEquipeBase;

export interface LivreurCompte {
  id: string;
  nom: string;
  telephone: string;
  type_vehicule: TypeVehicule;
  statut: StatutLivreur;
  immatriculation?: string;
  ville?: number;
}

/** Nom affichable : préfère nom_complet, sinon "prenom nom", sinon le téléphone. */
export function nomAfficheCompteEquipe(compte: CompteEquipeBase): string {
  if (compte.nom_complet) {
    return compte.nom_complet;
  }
  const compose = [compte.prenom, compte.nom].filter(Boolean).join(' ').trim();
  return compose || compte.telephone;
}

// ---- Requêtes de création ----

export interface RequeteCreerSuperviseur {
  telephone: string;
  prenom?: string;
  nom?: string;
  nom_bureau?: string;
  ville_id: number;
}

export interface ReponseCreationSuperviseur {
  superviseur_id: number;
  telephone: string;
  pin_clair: string;
  message?: string;
}

export interface RequeteCreerGestionnaire {
  telephone: string;
  prenom?: string;
  nom?: string;
  nom_bureau?: string;
  ville_id: number;
}

export interface ReponseCreationGestionnaire {
  gestionnaire_id: number;
  telephone: string;
  pin_clair: string;
  message?: string;
}

export interface RequeteCreerLivreurCompte {
  telephone: string;
  prenom?: string;
  nom?: string;
  type_vehicule?: TypeVehicule;
  immatriculation?: string;
  ville_id: number;
}

export interface ReponseCreationLivreurCompte {
  livreur_id: string;
  telephone: string;
  pin_clair: string;
  message?: string;
}

// ---- Type d'équipe (pilote l'UI générique liste + dialog de création) ----

export type TypeCompteEquipe = 'superviseur' | 'gestionnaire' | 'livreur';

export const LIBELLES_TYPE_COMPTE: Record<TypeCompteEquipe, string> = {
  superviseur: 'superviseur',
  gestionnaire: 'gestionnaire',
  livreur: 'livreur',
};

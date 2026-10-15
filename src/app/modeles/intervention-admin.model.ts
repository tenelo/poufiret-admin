/**
 * Reflète /administration/interventions/... : centre des demandes d'intervention, sur le modèle du
 * centre des commandes (onglets par statut, filtres, détail en panneau, actions, notes, export).
 * Lecture : capacité voir_interventions OU gerer_interventions. Écriture (transition, assignation
 * d'un artisan, notes) : réservée à gerer_interventions (voir Interventions.peutGerer). Aucun nom
 * de statut n'est supposé côté interface : statuts, urgences, types et libellés viennent tous du
 * backend (GET meta/). Pas de pagination DRF classique (vérifié sur une réponse réelle du serveur,
 * voir ReponseInterventionsAdmin) : { total, resultats, compteurs_statut }, ce dernier portant une
 * clé par statut de meta.statuts PLUS une clé `total` (pas à recalculer en sommant les autres).
 */
import { EvenementHistorique, NoteAdmin } from './commande-admin.model';

export interface StatutInterventionMeta {
  valeur: string;
  libelle: string;
}

export interface UrgenceInterventionMeta {
  valeur: string;
  libelle: string;
}

export interface TypeInterventionMeta {
  valeur: string;
  libelle: string;
}

/** GET administration/interventions/meta/. */
export interface MetaInterventions {
  statuts: StatutInterventionMeta[];
  urgences: UrgenceInterventionMeta[];
  types: TypeInterventionMeta[];
}

/** Ligne de GET administration/interventions/. */
export interface InterventionAdmin {
  id: number;
  numero: string;
  statut: string;
  statut_libelle: string;
  type_intervention: string;
  // Confirmé sur une réponse réelle : la clé est `type_libelle`, pas `type_intervention_libelle`.
  type_libelle: string;
  type_libre: string;
  description: string;
  urgence: string;
  urgence_libelle: string;
  client_telephone: string;
  client_nom: string;
  artisan_id: number | null;
  artisan_nom: string | null;
  artisan_type: string | null;
  adresse_snapshot: string;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  acceptee_le: string | null;
  terminee_le: string | null;
}

/**
 * Compteur par onglet (clé = code statut de meta.statuts, + une clé `total` pour « Toutes ») —
 * optionnel : absent → aucun badge affiché, sans erreur (voir Interventions.compteur).
 */
export type CompteursStatutInterventions = Record<string, number>;

/** GET administration/interventions/ : filtrée, { total, resultats, compteurs_statut } — pas de count/next/previous. */
export interface ReponseInterventionsAdmin {
  total: number;
  resultats: InterventionAdmin[];
  compteurs_statut?: CompteursStatutInterventions;
}

export interface ContactIntervention {
  id: number;
  nom: string;
  telephone: string;
}

/** GET /<id>/artisans-compatibles/ : partenaires actifs compatibles avec cette demande, pour la liste déroulante d'assignation. */
export interface ArtisanCompatible {
  id: number;
  nom: string;
  telephone: string;
}

export interface PhotoIntervention {
  id: number;
  image: string;
}

export interface TransitionPossibleIntervention {
  action: string;
  libelle: string;
  commentaire_obligatoire: boolean;
}

/**
 * GET administration/interventions/<id>/ : fiche complète. `historique`/`notes_admin` réutilisent
 * la forme déjà employée pour les commandes (même convention backend) — voir HistoriqueCommande,
 * réutilisé tel quel pour l'affichage. Champs non vérifiés sur une réponse réelle (seules la liste
 * et meta/ l'ont été) : `type_libelle` aligné par cohérence avec la liste, à confirmer si besoin.
 */
export interface InterventionAdminDetail {
  id: number;
  numero: string;
  statut: string;
  statut_libelle: string;
  type_intervention: string;
  type_libelle: string;
  type_libre: string;
  urgence: string;
  urgence_libelle: string;
  description: string;
  adresse: string;
  latitude: string | null;
  longitude: string | null;
  client: ContactIntervention;
  artisan: ContactIntervention | null;
  photos: PhotoIntervention[];
  created_at: string;
  acceptee_le: string | null;
  terminee_le: string | null;
  historique: EvenementHistorique[];
  notes_admin: NoteAdmin[];
  transitions_possibles: TransitionPossibleIntervention[];
}

// ---- Onglets et filtres (centre admin) ----

/** Onglet « Toutes » + un onglet par statut connu de meta (voir Interventions.onglets). */
export const ONGLET_TOUTES_INTERVENTIONS = 'toutes' as const;

export interface FiltresInterventionsAdmin {
  statut: string;
  urgence: string;
  type: string;
  // Pas d'annuaire d'artisans fourni par le contrat : recherche texte envoyée telle quelle.
  artisan: string;
  recherche: string;
  du: string;
  au: string;
}

export const FILTRES_INTERVENTIONS_DEFAUT: FiltresInterventionsAdmin = {
  statut: '',
  urgence: '',
  type: '',
  artisan: '',
  recherche: '',
  du: '',
  au: '',
};

/**
 * Reflète GET /publicites/admin/stats/ et POST /publicites/<id>/transition/<action>/
 * (StatsAdminView, TransitionPubliciteView côté admin). Distinct du modèle
 * partenaire (modeles/publicite.model.ts) : ici la vue est "format complet,
 * sans filtre de visibilité", mais on reste prudent sur les champs statistiques
 * (optionnels) au cas où l'un d'eux serait absent pour une campagne donnée.
 */

export type StatutPubliciteAdmin =
  | 'brouillon'
  | 'en_attente_paiement'
  | 'en_attente_validation'
  | 'active'
  | 'rejetee'
  | 'terminee';

// Champs optionnels par prudence : ne pas supposer leur présence systématique.
export interface TotauxPublicitesAdmin {
  nb_publicites?: number;
  nb_actives?: number;
  total_impressions?: number;
  total_personnes_touchees?: number;
  total_clics?: number;
}

export interface PubliciteAdmin {
  id: string;
  titre: string;
  formule: string | number;
  statut: StatutPubliciteAdmin;
  nb_personnes_touchees?: number;
  nb_impressions?: number;
  nb_clics?: number;
  taux_clic?: number;
  impressions_par_type?: Record<string, number>;
  cible_pourcentage?: number | null;
  cible_atteinte?: boolean;
  debut_diffusion?: string | null;
  fin_diffusion?: string | null;
}

export interface StatsPublicitesAdmin {
  totaux: TotauxPublicitesAdmin;
  publicites: PubliciteAdmin[];
}

export type ActionTransitionPubliciteId = 'confirmer_paiement' | 'valider' | 'rejeter' | 'terminer';

export interface ActionTransitionPubliciteAdmin {
  cible: ActionTransitionPubliciteId;
  libelle: string;
  dangereuse?: boolean;
}

export interface ReponseTransitionPubliciteAdmin {
  statut: string;
  message: string;
}

// Actions admin valides selon le statut courant — n'afficher que celles-ci.
export const TRANSITIONS_ADMIN_PUBLICITE: Record<StatutPubliciteAdmin, ActionTransitionPubliciteAdmin[]> = {
  brouillon: [],
  en_attente_paiement: [
    { cible: 'confirmer_paiement', libelle: 'Confirmer le paiement' },
    { cible: 'rejeter', libelle: 'Rejeter', dangereuse: true },
  ],
  en_attente_validation: [
    { cible: 'valider', libelle: 'Valider' },
    { cible: 'rejeter', libelle: 'Rejeter', dangereuse: true },
  ],
  active: [{ cible: 'terminer', libelle: 'Terminer' }],
  rejetee: [],
  terminee: [],
};

export const LIBELLES_STATUT_PUBLICITE_ADMIN: Record<StatutPubliciteAdmin, string> = {
  brouillon: 'Brouillon',
  en_attente_paiement: 'En attente de paiement',
  en_attente_validation: 'En attente de validation',
  active: 'Active',
  rejetee: 'Rejetée',
  terminee: 'Terminée',
};

export type TypeExportPublicites = 'publicites' | 'impressions' | 'profils' | 'sessions';

export const OPTIONS_EXPORT_PUBLICITES: { valeur: TypeExportPublicites; libelle: string }[] = [
  { valeur: 'publicites', libelle: 'Publicités' },
  { valeur: 'impressions', libelle: 'Impressions' },
  { valeur: 'profils', libelle: 'Profils' },
  { valeur: 'sessions', libelle: 'Sessions' },
];

/**
 * Reflète GET /publicites/admin/stats/ et POST /publicites/<id>/transition/<action>/
 * (StatsAdminView, TransitionPubliciteView côté admin). Distinct du modèle
 * partenaire (modeles/publicite.model.ts) : ici la vue est "format complet,
 * sans filtre de visibilité", mais on reste prudent sur les champs statistiques
 * (optionnels) au cas où l'un d'eux serait absent pour une campagne donnée.
 */

import { PorteePublicite } from './publicite.model';

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
  // Portée choisie et portée effective (MAX(forfait, choisie)) ; optionnelles par prudence.
  portee?: PorteePublicite;
  portee_effective?: PorteePublicite;
  nb_personnes_touchees?: number;
  nb_impressions?: number;
  nb_clics?: number;
  taux_clic?: number;
  impressions_par_type?: Record<string, number>;
  cible_pourcentage?: number | null;
  cible_atteinte?: boolean;
  debut_diffusion?: string | null;
  fin_diffusion?: string | null;
  // URLs absolues, fournies par le backend telles quelles.
  image_couverture?: string | null;
  video?: string | null;
}

/** Compteurs par statut (hors brouillon) ; ignorent le filtre `statut` mais respectent les autres. */
export type CompteursStatutPubliciteAdmin = Partial<
  Record<Exclude<StatutPubliciteAdmin, 'brouillon'> | 'total', number>
>;

export interface StatsPublicitesAdmin {
  totaux: TotauxPublicitesAdmin;
  compteurs_statut?: CompteursStatutPubliciteAdmin;
  publicites: PubliciteAdmin[];
}

/** Onglet "Toutes" = aucun filtre de statut envoyé à l'API. */
export type OngletStatutPubliciteAdmin = Exclude<StatutPubliciteAdmin, 'brouillon'> | 'toutes';

export const ONGLETS_STATUT_PUBLICITE_ADMIN: { valeur: OngletStatutPubliciteAdmin; libelle: string }[] = [
  { valeur: 'en_attente_paiement', libelle: 'En attente de paiement' },
  { valeur: 'en_attente_validation', libelle: 'En attente de validation' },
  { valeur: 'active', libelle: 'Actives' },
  { valeur: 'terminee', libelle: 'Terminées' },
  { valeur: 'rejetee', libelle: 'Rejetées' },
  { valeur: 'toutes', libelle: 'Toutes' },
];

/** Filtres envoyés à GET /publicites/admin/stats/ (chaîne vide = filtre non appliqué). */
export interface FiltresPublicitesAdmin {
  statut: OngletStatutPubliciteAdmin;
  recherche: string;
  formule: string;
  portee: PorteePublicite | '';
}

export const FILTRES_PUBLICITES_ADMIN_DEFAUT: FiltresPublicitesAdmin = {
  statut: 'en_attente_validation',
  recherche: '',
  formule: '',
  portee: '',
};

/** Ligne de GET /publicites/admin/formules/ : occupation du quota d'une formule. */
export interface QuotaFormule {
  id: string;
  nom: string;
  prix: number;
  est_active: boolean;
  quota_partenaires: number;
  nb_actives: number;
  places_restantes: number;
  nb_en_attente: number;
  nb_en_attente_paiement: number;
  nb_en_attente_validation: number;
}

export interface ReponseQuotasFormules {
  formules: QuotaFormule[];
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
  // Libellé affiché seulement : l'action envoyée au backend reste "terminer".
  active: [{ cible: 'terminer', libelle: 'Arrêter la pub' }],
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

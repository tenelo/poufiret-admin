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
  // Le partenaire voit-il les stats de cette campagne ? (interrupteur admin, campagnes actives/terminées)
  stats_visibles_partenaire?: boolean;
  // URLs absolues, fournies par le backend telles quelles.
  image_couverture?: string | null;
  video?: string | null;
  // Optionnels (rappel de la fenêtre « Reconduire ») : affichés seulement s'ils sont fournis.
  description?: string | null;
  partenaire_nom?: string | null;
  formule_id?: string | null;
  // Reconduction (champs optionnels pour compatibilité ascendante) : date de la copie la plus
  // récente, son identité/statut, et si cette pub peut elle-même être reconduite.
  reconduite_le?: string | null;
  reconduction_id?: string | null;
  reconduction_statut?: StatutPubliciteAdmin | null;
  peut_etre_reconduite?: boolean;
  // Renseigné seulement sur une copie : id de la pub d'origine.
  reconduite_depuis_id?: string | null;
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
  // Durée de diffusion (jours), si l'endpoint la fournit ; sinon lue dans GET /publicites/formules/.
  duree_jours?: number;
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

// ---- Pub créée ou reconduite par l'admin pour un partenaire (capacité gerer_pubs_partenaires) ----

/** Règlement obligatoire d'une pub créée ou reconduite par l'admin. */
export type ReglementPubPartenaire = 'payee' | 'offerte';

export const OPTIONS_REGLEMENT_PUB_PARTENAIRE: { valeur: ReglementPubPartenaire; libelle: string }[] = [
  { valeur: 'payee', libelle: 'Payée' },
  { valeur: 'offerte', libelle: 'Offerte' },
];

/** Champs communs à la création et à la reconduction (dates AAAA-MM-JJ). */
interface RequetePubPartenaireCommune {
  dateDebut: string;
  /** Absente si l'admin n'a pas modifié la valeur préremplie : le serveur calcule alors la fin
   *  selon la durée de la formule. */
  dateFin?: string;
  reglement: ReglementPubPartenaire;
  /** Seulement pour « Offerte » (ignoré sinon). */
  motif?: string;
}

/** Corps de la création (envoyé en multipart par PublicitesAdminService). */
export interface RequeteCreationPubPartenaire extends RequetePubPartenaireCommune {
  partenaireId: number;
  formuleId: string;
  titre: string;
  description?: string;
  imageCouverture: File;
  video?: File;
  portee?: PorteePublicite;
}

/** Corps de la reconduction (multipart) : formule et image facultatives (sinon celles d'origine). */
export interface RequeteReconductionPubPartenaire extends RequetePubPartenaireCommune {
  formuleId?: string;
  imageCouverture?: File;
}

/** Ajoute `jours` jours à une date AAAA-MM-JJ (calcul en UTC, sans décalage de fuseau). */
export function ajouterJours(dateIso: string, jours: number): string {
  const [annee, mois, jour] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour + jours));
  return date.toISOString().slice(0, 10);
}

// ---- Liste paginée (GET /publicites/admin/liste/), compteurs et vue par partenaire ----

/** Comment la pub a été réglée : payée par le partenaire, offerte, ou créée directement par l'admin. */
export type OriginePubliciteAdmin = 'payee' | 'offerte' | 'admin';

export const OPTIONS_ORIGINE_PUBLICITE_ADMIN: { valeur: OriginePubliciteAdmin; libelle: string }[] = [
  { valeur: 'payee', libelle: 'Payée' },
  { valeur: 'offerte', libelle: 'Offerte' },
  { valeur: 'admin', libelle: 'Créée par l’admin' },
];

export type ChampTriPubliciteAdmin =
  | 'cree_le'
  | 'debut_diffusion'
  | 'fin_diffusion'
  | 'affichages'
  | 'clics'
  | 'partenaire'
  | 'titre';

// Libellés neutres (sans sens implicite) : la direction (↑/↓) est affichée séparément, à côté du
// sélecteur — un libellé du type « Plus récentes » mentirait dès que le tri est inversé.
export const OPTIONS_TRI_PUBLICITE_ADMIN: { valeur: ChampTriPubliciteAdmin; libelle: string }[] = [
  { valeur: 'cree_le', libelle: 'Date de création' },
  { valeur: 'debut_diffusion', libelle: 'Début de diffusion' },
  { valeur: 'fin_diffusion', libelle: 'Fin de diffusion' },
  { valeur: 'affichages', libelle: 'Affichages' },
  { valeur: 'clics', libelle: 'Clics' },
  { valeur: 'partenaire', libelle: 'Partenaire' },
  { valeur: 'titre', libelle: 'Titre' },
];

export const TAILLES_PAGE_PUBLICITES_ADMIN = [25, 50, 100] as const;

/** Filtres envoyés à GET /publicites/admin/liste/ (chaîne/tableau vide = filtre non appliqué). */
export interface FiltresListePublicitesAdmin {
  statut: OngletStatutPubliciteAdmin;
  recherche: string;
  formule: string;
  portee: PorteePublicite | '';
  partenaireId: number | null;
  dateDebut: string;
  dateFin: string;
  origine: OriginePubliciteAdmin[];
  champTri: ChampTriPubliciteAdmin;
  triDescendant: boolean;
  page: number;
  pageSize: number;
}

export const FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT: FiltresListePublicitesAdmin = {
  statut: 'en_attente_validation',
  recherche: '',
  formule: '',
  portee: '',
  partenaireId: null,
  dateDebut: '',
  dateFin: '',
  origine: [],
  champTri: 'cree_le',
  triDescendant: true,
  page: 1,
  pageSize: 25,
};

/** Sous-ensemble émis par la barre de filtres (tri/page/pageSize sont gérés par la pagination). */
export type FiltresRecherchePublicitesAdmin = Pick<
  FiltresListePublicitesAdmin,
  'statut' | 'recherche' | 'formule' | 'portee' | 'partenaireId' | 'dateDebut' | 'dateFin' | 'origine'
>;

/** `ordre` envoyé à l'API : préfixe `-` pour descendant (ex. `-cree_le`, `titre`). */
export function construireParametreOrdre(champ: string, descendant: boolean): string {
  return descendant ? `-${champ}` : champ;
}

export interface ReponseListePublicitesAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: PubliciteAdmin[];
  compteurs_statut?: CompteursStatutPubliciteAdmin;
}

/** Ligne de GET /publicites/admin/partenaires/. */
export interface PartenairePubliciteAdmin {
  partenaire_id: number;
  nom_commerce: string;
  telephone?: string | null;
  nb_publicites: number;
  par_statut?: Partial<Record<StatutPubliciteAdmin, number>>;
  total_affichages?: number;
  total_clics?: number;
  derniere_pub_le?: string | null;
}

export type ChampTriPartenairePubliciteAdmin = 'nom' | 'nb_publicites' | 'affichages' | 'clics' | 'derniere_pub';

// Même remarque que OPTIONS_TRI_PUBLICITE_ADMIN : libellés neutres, direction affichée séparément.
export const OPTIONS_TRI_PARTENAIRE_PUBLICITE_ADMIN: { valeur: ChampTriPartenairePubliciteAdmin; libelle: string }[] = [
  { valeur: 'derniere_pub', libelle: 'Date de la dernière pub' },
  { valeur: 'nom', libelle: 'Commerce' },
  { valeur: 'nb_publicites', libelle: 'Nombre de pubs' },
  { valeur: 'affichages', libelle: 'Affichages' },
  { valeur: 'clics', libelle: 'Clics' },
];

/** Filtres envoyés à GET /publicites/admin/partenaires/ (pas de filtre de statut : vue globale par partenaire). */
export interface FiltresPartenairesPubliciteAdmin {
  recherche: string;
  formule: string;
  portee: PorteePublicite | '';
  dateDebut: string;
  dateFin: string;
  origine: OriginePubliciteAdmin[];
  champTri: ChampTriPartenairePubliciteAdmin;
  triDescendant: boolean;
  page: number;
  pageSize: number;
}

export const FILTRES_PARTENAIRES_PUBLICITE_ADMIN_DEFAUT: FiltresPartenairesPubliciteAdmin = {
  recherche: '',
  formule: '',
  portee: '',
  dateDebut: '',
  dateFin: '',
  origine: [],
  champTri: 'derniere_pub',
  triDescendant: true,
  page: 1,
  pageSize: 25,
};

export interface ReponseListePartenairesPubliciteAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: PartenairePubliciteAdmin[];
}

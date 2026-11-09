/**
 * Reflète /api/v1/avis/admin/... : modération des avis clients (capacité gerer_avis, super-admin
 * toujours autorisé). Liste filtrée/paginée (GET) + bascule de visibilité (PATCH, motif obligatoire
 * pour masquer). Forme de pagination non vérifiée sur une réponse réelle (endpoint nouveau côté
 * admin Angular) : gérée défensivement par le service, qu'elle suive la pagination DRF classique
 * ({count, next, previous, results}) ou la convention {total, resultats} déjà vue ailleurs dans
 * cette admin (interventions, locations) — voir AvisAdminService.normaliser.
 */

/** Un avis peut cibler un partenaire (son nom est fourni) ou un livreur (pas de libellé dédié
 *  dans le contrat : affiché par son identifiant, voir AvisAdmin.partenaireOuLivreur). */
export interface AvisAdmin {
  id: number;
  objet_type: string;
  objet_id: number;
  partenaire: number | null;
  partenaire_nom: string | null;
  livreur: number | null;
  auteur: number;
  auteur_nom: string;
  note: number;
  commentaire: string;
  est_visible: boolean;
  reponse_partenaire: string | null;
  repondu_le: string | null;
  cree_le: string;
  modifie_le: string;
}

export interface ReponseAvisAdmin {
  count?: number;
  total?: number;
  next?: string | null;
  previous?: string | null;
  results?: AvisAdmin[];
  resultats?: AvisAdmin[];
}

export interface FiltresAvisAdmin {
  recherche: string;
  note: string;
  visible: string;
  objetType: string;
  partenaire: string;
  du: string;
  au: string;
}

export const FILTRES_AVIS_DEFAUT: FiltresAvisAdmin = {
  recherche: '',
  note: '',
  visible: '',
  objetType: '',
  partenaire: '',
  du: '',
  au: '',
};

export const OPTIONS_NOTE_AVIS = [1, 2, 3, 4, 5];

export const OPTIONS_VISIBILITE_AVIS: { valeur: string; libelle: string }[] = [
  { valeur: '1', libelle: 'Visibles' },
  { valeur: '0', libelle: 'Masqués' },
];

/** « Nom du partenaire » si présent, sinon « Livreur #id » (pas de libellé dédié côté contrat), sinon « — ». */
export function partenaireOuLivreur(avis: AvisAdmin): string {
  if (avis.partenaire_nom) return avis.partenaire_nom;
  if (avis.livreur) return `Livreur #${avis.livreur}`;
  return '—';
}

/** « ★★★☆☆ » à partir de la note (1-5), jamais hors bornes même sur une valeur inattendue. */
export function etoiles(note: number): string {
  const pleines = Math.max(0, Math.min(5, Math.round(note)));
  return '★'.repeat(pleines) + '☆'.repeat(5 - pleines);
}

/**
 * Reflète la gestion admin des formules publicitaires
 * (GET/POST /publicites/admin/formules/gestion/, PATCH/DELETE .../gestion/<uuid>/) et les
 * paramètres généraux (GET/PATCH /publicites/admin/parametres/). Capacité : gerer_formules_pub.
 */

export type TypeAffichagePub = 'carrousel' | 'interstitiel' | 'bandeau_bas' | 'page_publicites';

export const OPTIONS_TYPE_AFFICHAGE_PUB: { valeur: TypeAffichagePub; libelle: string }[] = [
  { valeur: 'carrousel', libelle: 'Carrousel' },
  { valeur: 'interstitiel', libelle: 'Interstitiel' },
  { valeur: 'bandeau_bas', libelle: 'Bandeau du bas' },
  { valeur: 'page_publicites', libelle: 'Page publicités' },
];

export function libelleTypeAffichagePub(valeur: string): string {
  return OPTIONS_TYPE_AFFICHAGE_PUB.find((o) => o.valeur === valeur)?.libelle ?? valeur;
}

export interface FormulePubAdmin {
  // UUID.
  id: string;
  nom: string;
  prix: number;
  priorite: number;
  est_active: boolean;
  duree_jours: number;
  passages_par_jour: number;
  duree_affichage_secondes: number;
  passages_par_type: Record<string, number>;
  quota_partenaires: number;
  acces_heures_affluence: boolean;
  types_affichage: TypeAffichagePub[];
  nb_images_max: number;
  video_autorisee: boolean;
  duree_video_max_secondes: number;
  // null = aucune garantie de couverture ; sinon 1-100.
  cible_pourcentage_actifs: number | null;
  // Lecture seule ; absents en création (nb_actives est renvoyé aussi par le PATCH).
  nb_actives?: number;
  nb_en_attente?: number;
  nb_pubs_total?: number;
}

/** Corps envoyé en POST (création) et PATCH (partiel) : tous les champs éditables. */
export type RequeteFormulePub = Omit<FormulePubAdmin, 'id' | 'nb_actives' | 'nb_en_attente' | 'nb_pubs_total'>;

export interface ReponsePagineeFormulesPub {
  count: number;
  next: string | null;
  previous: string | null;
  results: FormulePubAdmin[];
}

/** Valeurs par défaut d'une nouvelle formule (alignées sur les défauts du backend). */
export const FORMULE_PUB_PAR_DEFAUT: RequeteFormulePub = {
  nom: '',
  prix: 0,
  priorite: 0,
  est_active: true,
  duree_jours: 1,
  passages_par_jour: 1,
  duree_affichage_secondes: 5,
  passages_par_type: {},
  quota_partenaires: 50,
  acces_heures_affluence: false,
  types_affichage: ['carrousel'],
  nb_images_max: 1,
  video_autorisee: false,
  duree_video_max_secondes: 30,
  cible_pourcentage_actifs: null,
};

/** GET/PATCH /publicites/admin/parametres/. */
export interface ParametresPub {
  affluence_debut: number;
  affluence_fin: number;
  calcul_affluence_auto: boolean;
  intervalle_min_interstitiel_secondes: number;
  validation_auto: boolean;
  interstitiel_minute_min: number;
  interstitiel_minute_max: number;
  interstitiel_ratio_session_courte: number;
}

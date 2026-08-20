/**
 * Reflète les modèles FormulePublicite et Publicite exposés par le backend
 * (GET /publicites/formules/, GET/POST /publicites/mes-publicites/,
 * POST /publicites/<uuid>/transition/<action>/).
 */

export type PorteePublicite = 'departement' | 'region' | 'district';

export type TypeAffichagePublicite = 'carrousel' | 'interstitiel' | 'bandeau_bas' | 'page_publicites';

export type StatutPublicite =
  | 'brouillon'
  | 'en_attente_paiement'
  | 'en_attente_validation'
  | 'active'
  | 'rejetee'
  | 'terminee';

export interface FormulePublicite {
  id: number;
  nom: string;
  prix: number;
  priorite: number;
  duree_jours: number;
  passages_par_jour: number;
  duree_affichage_secondes: number;
  quota_partenaires: number;
  acces_heures_affluence: boolean;
  types_affichage: TypeAffichagePublicite[];
  nb_images_max: number;
  video_autorisee: boolean;
  duree_video_max_secondes: number;
  cible_pourcentage_actifs: number | null;
}

/** Une campagne du partenaire connecté, telle que renvoyée par mes-publicites/. */
export interface MaPublicite {
  id: string;
  formule: number;
  titre: string;
  description: string;
  image_couverture: string | null;
  video: string | null;
  portee: PorteePublicite;
  statut: StatutPublicite;
}

// Corps de POST /publicites/mes-publicites/ (envoyé en multipart par le service).
export interface RequeteCreationPublicite {
  formule: number;
  titre: string;
  description?: string;
  imageCouverture: File;
  video?: File;
  portee: PorteePublicite;
}

export interface ReponseTransitionPublicite {
  statut: string;
  message: string;
}

export const LIBELLES_STATUT_PUBLICITE: Record<StatutPublicite, string> = {
  brouillon: 'Brouillon',
  en_attente_paiement: 'En attente de paiement',
  en_attente_validation: 'En attente de validation',
  active: 'Active',
  rejetee: 'Rejetée',
  terminee: 'Terminée',
};

export const LIBELLES_PORTEE: Record<PorteePublicite, string> = {
  departement: 'Département',
  region: 'Région',
  district: 'District',
};

export const OPTIONS_PORTEE: { valeur: PorteePublicite; libelle: string }[] = [
  { valeur: 'departement', libelle: 'Département' },
  { valeur: 'region', libelle: 'Région' },
  { valeur: 'district', libelle: 'District' },
];

/** GET /publicites/mes-stats/ — deux formes possibles par campagne. */
interface StatistiquePubliciteBase {
  id: string;
  titre: string;
  formule: string | number;
  statut: string;
}

export interface StatistiquePubliciteDetaillee extends StatistiquePubliciteBase {
  nb_personnes_touchees: number;
  nb_impressions: number;
  nb_clics: number;
  taux_clic: number;
  impressions_par_type: Record<string, number>;
  cible_pourcentage: number | null;
  cible_atteinte: boolean;
  debut_diffusion: string | null;
  fin_diffusion: string | null;
}

export interface StatistiquePubliciteRestreinte extends StatistiquePubliciteBase {
  stats_disponibles: false;
  message: string;
}

export type StatistiquePublicite = StatistiquePubliciteDetaillee | StatistiquePubliciteRestreinte;

export function estStatistiqueDetaillee(
  stats: StatistiquePublicite,
): stats is StatistiquePubliciteDetaillee {
  return !('stats_disponibles' in stats) || stats.stats_disponibles !== false;
}

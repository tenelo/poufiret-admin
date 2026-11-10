/**
 * Reflète /administration/categories/... (capacité gerer_parametres) : CRUD complet
 * des catégories de la grille de l'application (icône/image, parent, types de
 * partenaire liés, mots-clés de recherche, archivage).
 */

export type AffichageEnfantsCategorie = 'pastilles' | 'grille';

export interface CategorieAdmin {
  id: number;
  nom: string;
  slug: string;
  description: string;
  icone: string | null;
  image: string | null;
  ordre: number;
  est_active: boolean;
  est_archivee: boolean;
  parent_id: number | null;
  parent_nom: string | null;
  types_partenaire: string[];
  mots_cles: string[];
  nb_partenaires: number;
  nb_enfants: number;
  /** Présentation des sous-catégories dans l'app ; pastilles par défaut. */
  affichage_enfants: AffichageEnfantsCategorie;
}

export interface ReponseCategoriesAdmin {
  resultats: CategorieAdmin[];
}

// Un type de partenaire, et la catégorie à laquelle il est déjà lié le cas échéant
// (categorie_id/categorie_nom null si aucune catégorie ne le revendique encore).
export interface TypePartenaireCategorie {
  valeur: string;
  libelle: string;
  categorie_id: number | null;
  categorie_nom: string | null;
}

export interface ReponseTypesPartenaireCategorie {
  resultats: TypePartenaireCategorie[];
}

// Corps de POST/PATCH (multipart si une image est envoyée) : tous les champs sont
// optionnels côté PATCH (mise à jour partielle) ; `image` absent = inchangée,
// `supprimer_image: true` la retire (PATCH seulement).
export interface RequeteCategorieAdmin {
  nom?: string;
  description?: string;
  icone?: string;
  image?: File;
  supprimer_image?: boolean;
  parent_id?: number | null;
  est_active?: boolean;
  types_partenaire?: string[];
  mots_cles?: string[];
  affichage_enfants?: AffichageEnfantsCategorie;
}

// Corps de POST ordre/ : ordre complet des enfants directs d'un même parent
// (null = catégories racines).
export interface RequeteOrdreCategoriesAdmin {
  parent_id: number | null;
  ordre: number[];
}

export interface ErreursCategorieAdmin {
  nom: string | null;
  general: string | null;
}

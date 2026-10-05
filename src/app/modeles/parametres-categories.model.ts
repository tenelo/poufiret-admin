/**
 * Reflète /administration/parametres/categories/... (capacité gerer_parametres) :
 * ordre d'affichage et visibilité des catégories dans la grille de l'application.
 */

export interface CategorieOrdonnee {
  id: number;
  nom: string;
  icone: string | null;
  image: string | null;
  ordre: number;
  est_active: boolean;
  parent_id: number | null;
  nb_partenaires: number;
}

export interface ReponseCategoriesOrdonnees {
  resultats: CategorieOrdonnee[];
}

// Corps de POST categories/ordre/ : ordre complet des enfants directs d'un même parent
// (null = catégories racines).
export interface RequeteOrdreCategories {
  parent_id: number | null;
  ordre: number[];
}

// Corps de PATCH categories/<id>/.
export interface RequeteModifierCategorieActive {
  est_active: boolean;
}

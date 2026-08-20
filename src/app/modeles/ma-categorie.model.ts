/**
 * Reflète le modèle MaCategorie exposé par le backend Django
 * (GET /auth/mes-categories/, PATCH /auth/mes-categories/<id>/).
 */
export interface MaCategorie {
  id: number;
  categorie_nom: string;
  categorie_slug: string;
  categorie_icone: string | null;
  est_principale: boolean;
  image_couverture: string | null;
}

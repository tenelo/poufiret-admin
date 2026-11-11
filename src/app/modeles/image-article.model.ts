/** Reflète une image d'article exposée par /catalogue/images/. */
export interface ImageArticle {
  id: number;
  article: number;
  image: string;
  legende: string | null;
  ordre: number;
  est_principale: boolean;
  est_active: boolean;
}

/**
 * Plafond de photos de l'article, renvoyé par GET /catalogue/images/?article=<id> (clé
 * plafond_photos de la réponse) : max (null = illimité), source du plafond (catégorie ou
 * abonnement), et peut_ajouter déjà calculé côté serveur. Il n'existe PAS de champ équivalent
 * sur l'article lui-même (voir ArticleListe) : seule la liste des images l'expose.
 */
export interface PlafondPhotosArticle {
  max: number | null;
  source: 'categorie' | 'abonnement';
  categorie_id: number | null;
  categorie_nom: string | null;
  plan_libelle: string | null;
  nb_photos: number;
  peut_ajouter: boolean;
}

/** Corps exact de GET /catalogue/images/?article=<id> : liste (brute ou paginée) + plafond. */
export interface ReponseImagesArticle {
  results?: ImageArticle[];
  resultats?: ImageArticle[];
  plafond_photos?: PlafondPhotosArticle;
}

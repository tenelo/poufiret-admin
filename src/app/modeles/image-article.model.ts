/** Reflète une image d'article exposée par /catalogue/images/. */
export interface ImageArticle {
  id: number;
  article: number;
  image: string;
  legende: string | null;
  ordre: number;
  est_principale: boolean;
}

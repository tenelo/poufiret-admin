/**
 * Reflète le modèle Article exposé par le backend Django
 * (GET/POST/PATCH/DELETE /catalogue/articles/).
 */

export type TypeArticle = 'produit' | 'plat' | 'service' | 'logement' | 'vehicule';

// Champs communs à la liste et au détail (tous en lecture seule côté API).
interface ChampsArticleLectureSeule {
  id: number;
  slug: string;
  prix_effectif: string;
  pourcentage_reduction: number | null;
  promotion_valide: boolean;
  nb_vues: number;
  nb_likes: number;
  partenaire: number;
  partenaire_nom: string;
}

/** Item tel que renvoyé par GET /catalogue/articles/ (liste paginée). */
export interface ArticleListe extends ChampsArticleLectureSeule {
  nom: string;
  type: TypeArticle;
  prix: string;
  prix_promotion: string | null;
  est_en_promotion: boolean;
  est_disponible: boolean;
  categorie: number | null;
  image_principale: string | null;
}

/** Détail complet tel que renvoyé par GET /catalogue/articles/<slug>/. */
export interface ArticleDetail extends ArticleListe {
  description: string;
  unite: string | null;
  details: string | null;
  est_actif: boolean;
  temps_preparation_min: number | null;
  section_menu: string | null;
}

/** Corps de la requête POST/PATCH /catalogue/articles/ : slug et partenaire posés par le serveur. */
export interface RequeteArticle {
  nom: string;
  description: string;
  type: TypeArticle;
  prix: number;
  prix_promotion: number | null;
  unite: string;
  details: string;
  est_actif: boolean;
  est_disponible: boolean;
  est_en_promotion: boolean;
  temps_preparation_min: number | null;
  categorie: number;
  section_menu: string;
}

export const OPTIONS_TYPE_ARTICLE: { valeur: TypeArticle; libelle: string }[] = [
  { valeur: 'produit', libelle: 'Produit' },
  { valeur: 'plat', libelle: 'Plat' },
  { valeur: 'service', libelle: 'Service' },
  { valeur: 'logement', libelle: 'Logement' },
  { valeur: 'vehicule', libelle: 'Véhicule' },
];

/**
 * Reflète /administration/parametres/recherche/... (capacité gerer_parametres) :
 * dictionnaire de mots-clés par catégorie et traitement des recherches sans résultat.
 */

export interface CategorieMotsCles {
  id: number;
  nom: string;
  parent_id: number | null;
  mots_cles: string[];
}

export interface ReponseCategoriesMotsCles {
  resultats: CategorieMotsCles[];
}

// Corps de PATCH recherche/categories/<id>/.
export interface RequeteModifierMotsCles {
  mots_cles: string[];
}

export type StatutRechercheSansResultat = 'a_traiter' | 'traite' | 'ignore';
export type FiltreStatutRechercheSansResultat = StatutRechercheSansResultat | 'tous';

export interface RechercheSansResultat {
  id: number;
  terme: string;
  nb_recherches: number;
  derniere_recherche: string;
  statut: StatutRechercheSansResultat;
}

export interface CompteursRechercheSansResultat {
  a_traiter: number;
  traite: number;
  ignore: number;
}

export interface ReponseRecherchesSansResultat {
  resultats: RechercheSansResultat[];
  compteurs: CompteursRechercheSansResultat;
}

export interface FiltresRecherchesSansResultat {
  statut: FiltreStatutRechercheSansResultat;
  du?: string;
  au?: string;
}

// Corps de POST recherche/sans-resultat/<id>/traiter/.
export type RequeteTraiterRecherche = { action: 'ajouter_mot_cle'; categorie_id: number } | { action: 'ignorer' };

export interface ResultatTestRecherche {
  categories: { id: number; nom: string }[];
  partenaires: { id: number; nom: string }[];
  articles: { id: number; nom: string }[];
  total: number;
}

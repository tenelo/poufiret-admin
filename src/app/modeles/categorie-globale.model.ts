/**
 * Reflète une catégorie globale du catalogue telle qu'exposée par
 * GET /catalogue/categories/ pour le dialog d'ajout de "Mes catégories"
 * ({count, results:[{id, nom, slug, icone, ...}]}, liste plate).
 *
 * Modèle dédié, séparé de `CategorieCatalogue` (modeles/categorie-catalogue.model.ts) :
 * ce dernier modélise l'arbre récursif utilisé pour les sélecteurs d'articles
 * (mes-produits, création partenaire) et ne doit pas être modifié ici.
 */
export interface CategorieGlobale {
  id: number;
  nom: string;
  slug: string;
  icone: string | null;
}

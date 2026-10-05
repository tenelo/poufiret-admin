/**
 * Reflète GET /catalogue/correspondances-types/ : pour chaque type de partenaire, la catégorie du
 * catalogue qui lui correspond. Le backend ajoute de toute façon cette catégorie à
 * l'enregistrement ; côté Angular, ça sert seulement à rendre la règle visible (catégorie cochée
 * automatiquement, badge "Principale") — jamais à la forcer silencieusement.
 */
export interface CorrespondanceTypeCategorie {
  type_partenaire: string;
  type_libelle: string;
  categorie_id: number;
  categorie_nom: string;
}

export interface ReponseCorrespondancesTypes {
  correspondances: CorrespondanceTypeCategorie[];
}

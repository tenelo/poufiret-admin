/**
 * Reflète GET /api/v1/restaurants/admin/ : liste admin des restaurants.
 * URL et format vérifiés en production (réponse réelle observée) : {"resultats": [...]}, sans
 * pagination, avec exactement ces champs.
 */

export interface RestaurantAdminListe {
  // Id ProfilPartenaire (le "<partenaire_id>" des autres routes restaurant).
  id: number;
  nom: string;
  departement_nom: string;
  // False si le restaurateur n'a pas encore renseigné sa fiche (/fiche/ jamais appelé en PATCH).
  a_une_fiche: boolean;
  ouvert: boolean;
  menu_du_jour_publie: boolean;
  commandes_du_jour: number;
}

/** Corps exact de GET /api/v1/restaurants/admin/ : pas de pagination, pas de forme alternative. */
export interface ReponseRestaurantsAdminListe {
  resultats: RestaurantAdminListe[];
}

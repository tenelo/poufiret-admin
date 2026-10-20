/**
 * Reflète GET /api/v1/restaurants/admin/ : liste admin des établissements (ex-restaurants).
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
  /** restaurant | boulangerie | pharmacie | mode | librairie | generique (voir Gabarit). */
  gabarit?: string | null;
}

/** Corps exact de GET /api/v1/restaurants/admin/ : pas de pagination, pas de forme alternative. */
export interface ReponseRestaurantsAdminListe {
  resultats: RestaurantAdminListe[];
}

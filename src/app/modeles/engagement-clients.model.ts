/**
 * Reflète GET /analytics/admin/engagement/ (EngagementAdminView). Réponse non
 * paginée : toute la liste de profils arrive d'un coup, à paginer côté client.
 * `est_client_actif` est déjà calculé par le backend (7j de connexion ET
 * ≥5 articles vus ce mois ET ≥15 min cumulées ce mois) — ne pas le recalculer.
 */

export interface ProfilEngagement {
  utilisateur_id: number;
  telephone: string;
  username: string;
  nb_articles_vus_mois: number;
  nb_vues_catalogue_mois: number;
  temps_cumule_secondes_mois: number;
  derniere_activite: string | null;
  est_client_actif: boolean;
  categories_consultees: Record<string, number>;
}

export interface EngagementClients {
  nb_profils: number;
  nb_clients_actifs: number;
  profils: ProfilEngagement[];
}

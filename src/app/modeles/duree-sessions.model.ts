/**
 * Reflète GET /analytics/admin/duree-sessions/ (ADroitDe('voir_stats')).
 * Filtre optionnel ?jours=N (mêmes conventions que stats-connexion).
 */

export interface DureeParUtilisateur {
  utilisateur_id: number;
  telephone: string;
  nom: string;
  nb_sessions: number;
  duree_totale_secondes: number;
  duree_moyenne_secondes: number;
}

export interface DureeParJour {
  date: string;
  duree_moyenne_secondes: number;
  nb_sessions: number;
}

export interface DureeSessions {
  duree_moyenne_globale_secondes: number;
  duree_mediane_globale_secondes: number;
  nb_sessions: number;
  // Trié par duree_totale_secondes décroissant côté backend.
  par_utilisateur: DureeParUtilisateur[];
  par_jour: DureeParJour[];
}

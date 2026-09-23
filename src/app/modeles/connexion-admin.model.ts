/**
 * Reflète GET /administration/connexions-admin/ (lecture seule, protégé par
 * la capacité `lire_journal`).
 */

export interface ConnexionAdmin {
  id: string;
  utilisateur_id: number;
  telephone: string;
  nom: string;
  is_superuser: boolean;
  date_connexion: string;
  adresse_ip: string;
  plateforme: string;
  plateforme_libelle: string;
  appareil_nom: string;
  est_active: boolean;
  derniere_activite_le: string;
}

export interface ReponseConnexionsAdmin {
  total: number;
  resultats: ConnexionAdmin[];
}

// Filtres optionnels de GET /administration/connexions-admin/ (et son export).
export interface FiltresConnexionsAdmin {
  jours?: number;
  q?: string;
  utilisateur?: number;
}

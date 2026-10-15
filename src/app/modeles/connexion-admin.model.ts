/**
 * Reflète GET /administration/connexions-admin/ (lecture seule, protégé par
 * la capacité `lire_journal`) : une ligne par admin (plus une ligne de connexions par événement) —
 * `date_connexion`/`adresse_ip`/`appareil_nom` portent sur la DERNIÈRE connexion de cet admin.
 */

export interface ConnexionAdmin {
  id: string;
  utilisateur_id: number;
  telephone: string;
  nom: string;
  is_superuser: boolean;
  // Dernière connexion de cet admin.
  date_connexion: string;
  adresse_ip: string;
  plateforme: string;
  plateforme_libelle: string;
  appareil_nom: string;
  est_active: boolean;
  derniere_activite_le: string;
  // Nombre total de connexions de cet admin (toutes périodes confondues).
  nb_connexions: number;
  // Toute première connexion connue de cet admin.
  premiere_connexion: string;
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

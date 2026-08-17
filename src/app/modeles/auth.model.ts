import { Utilisateur } from './utilisateur.model';

// Corps de la requête POST /auth/connexion/ (le champ "password" contient le PIN à 4 chiffres).
export interface RequeteConnexion {
  telephone: string;
  password: string;
}

// Réponse de POST /auth/connexion/
export interface ReponseConnexion {
  access: string;
  refresh: string;
  utilisateur: Utilisateur;
}

// Réponse de POST /auth/rafraichir/ (le refresh peut être omis si le backend ne fait pas de rotation).
export interface ReponseRafraichissement {
  access: string;
  refresh?: string;
}

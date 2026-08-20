import { UtilisateurBrut } from './utilisateur.model';

// Corps de la requête POST /auth/connexion/ (le champ "password" contient le PIN à 4 chiffres).
export interface RequeteConnexion {
  telephone: string;
  password: string;
}

// Réponse de POST /auth/connexion/ (utilisateur en forme brute, mappée par AuthService).
export interface ReponseConnexion {
  access: string;
  refresh: string;
  utilisateur: UtilisateurBrut;
}

// Réponse de POST /auth/rafraichir/ (le refresh peut être omis si le backend ne fait pas de rotation).
export interface ReponseRafraichissement {
  access: string;
  refresh?: string;
}

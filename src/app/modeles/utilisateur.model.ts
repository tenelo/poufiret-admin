/**
 * Reflète le modèle Utilisateur exposé par le backend Django.
 */

// Valeurs réelles du champ "role" renvoyées par le backend (cf. projet Flutter Poufiret).
export type RoleUtilisateur = 'client' | 'partenaire' | 'admin';

export interface Utilisateur {
  id: number;
  telephone: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: RoleUtilisateur;
  est_verifie: boolean;
  pin_par_defaut: boolean;
  langue_preferee: string;
  token_fcm?: string | null;
  departement?: number | null;
  departement_nom?: string;
  region_nom?: string;
}

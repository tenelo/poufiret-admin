/**
 * Reflète le modèle Utilisateur exposé par le backend Django.
 */

// Valeurs réelles du champ "role" renvoyées par le backend (cf. projet Flutter Poufiret).
export type RoleUtilisateur = 'client' | 'partenaire' | 'admin';

// Valeurs du champ "espace" (nouveau), qui pilote l'aiguillage vers le bon
// espace web après connexion — indépendant de "role". "client"/"livreur"
// n'ont pas d'accès web (application mobile uniquement).
export type EspaceUtilisateur =
  | 'super_admin'
  | 'admin'
  | 'partenaire'
  | 'coordination_livraison'
  | 'supervision_livraison'
  | 'gestion_livraison'
  | 'client'
  | 'livreur';

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
  espace?: EspaceUtilisateur;
  livraisonDepartementId?: number | null;
  livraisonDepartementNom?: string;
  livraisonNomBureau?: string;
}

// Forme brute (snake_case) telle que renvoyée par le backend — utilisée
// uniquement en frontière réseau (réponse de connexion, /auth/moi/), avant
// mapping vers `Utilisateur`.
export interface UtilisateurBrut
  extends Omit<Utilisateur, 'livraisonDepartementId' | 'livraisonDepartementNom' | 'livraisonNomBureau'> {
  livraison_departement_id?: number | null;
  livraison_departement_nom?: string;
  livraison_nom_bureau?: string;
}

export function versUtilisateurModele(brut: UtilisateurBrut): Utilisateur {
  const { livraison_departement_id, livraison_departement_nom, livraison_nom_bureau, ...reste } = brut;
  return {
    ...reste,
    livraisonDepartementId: livraison_departement_id ?? null,
    livraisonDepartementNom: livraison_departement_nom,
    livraisonNomBureau: livraison_nom_bureau,
  };
}

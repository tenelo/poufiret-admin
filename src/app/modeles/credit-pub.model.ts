/**
 * Reflète les endpoints de crédits de publicité offerts par l'admin :
 * GET /administration/partenaires/recherche/?q=
 * GET/POST /administration/partenaires/<pk>/credits/
 * DELETE /administration/credits/<uuid>/
 * GET /publicites/formules/ (pour le sélecteur de formule)
 */

export interface PartenaireRecherche {
  id: number;
  nom_commerce: string;
  telephone: string;
  type_partenaire: string;
  type_partenaire_libelle: string;
  departement: string;
  statut: string;
  statut_libelle: string;
}

export type StatutCreditPub = 'disponible' | 'consomme';

export interface CreditPub {
  id: string;
  formule_id: number;
  formule_nom: string;
  formule_prix: number;
  statut: StatutCreditPub;
  motif: string;
  accorde_par: string;
  cree_le: string;
  consomme_le: string | null;
  publicite_consommatrice_id: string | null;
}

export interface PartenaireCredits {
  id: number;
  nom_commerce: string;
  telephone: string;
}

export interface ReponseCreditsPartenaire {
  partenaire: PartenaireCredits;
  credits: CreditPub[];
}

// Corps de POST /administration/partenaires/<pk>/credits/.
export interface RequeteAccorderCredit {
  formule_id: number;
  motif?: string;
}

export interface FormulePub {
  id: number;
  nom: string;
  prix: number;
  types_affichage: string[];
  est_active: boolean;
}

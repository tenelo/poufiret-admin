/**
 * Reflète la réponse de GET /administration/partenaires/ (IndicateursPartenairesView).
 * Les répartitions ont des clés variables côté backend : ne jamais les coder
 * en dur, toujours itérer sur les entrées du dictionnaire.
 */

// Tranches d'urgence d'expiration d'abonnement — exclusives (ne pas additionner
// en pensant qu'elles se chevauchent).
export interface ExpirationsAbonnement {
  deja_expire: number;
  demain: number;
  sous_5j: number;
  sous_15j: number;
  sous_30j: number;
}

export interface IndicateursPartenaires {
  total: number;
  par_plan: Record<string, number>;
  par_type: Record<string, number>;
  par_departement: Record<string, number>;
  par_statut: Record<string, number>;
  certifies: number;
  en_faveur: number;
  actifs: number;
  visibles: number;
  expirations: ExpirationsAbonnement;
}

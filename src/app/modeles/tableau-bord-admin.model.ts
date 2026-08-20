/**
 * Reflète la réponse de GET /administration/dashboard/ (DashboardG5View).
 * Ne couvre volontairement que l'activité comptes/connexions/appareils —
 * pas la livraison, traitée par une plateforme séparée.
 */

export interface RepartitionParRole {
  client: number;
  partenaire: number;
  livreur: number;
  admin: number;
}

export interface EnLigneAdmin {
  total: number;
  par_role: RepartitionParRole;
}

export interface ComptesAdmin {
  total: number;
  par_role: RepartitionParRole;
}

export interface ConnexionsPeriodeAdmin {
  total: number;
  par_role: RepartitionParRole;
}

export interface ConnexionsDistinctesAdmin {
  aujourdhui: ConnexionsPeriodeAdmin;
  sept_jours: ConnexionsPeriodeAdmin;
  trente_jours: ConnexionsPeriodeAdmin;
}

export interface OuverturesPeriodeAdmin {
  total: number;
  personnes: number;
  moyenne_par_personne: number;
}

export interface OuverturesAdmin {
  aujourdhui: OuverturesPeriodeAdmin;
  sept_jours: OuverturesPeriodeAdmin;
  trente_jours: OuverturesPeriodeAdmin;
}

export interface AppareilsAdmin {
  total: number;
  appareils_distincts: number;
  par_plateforme: Record<string, number>;
}

export interface ComptesParStatutAdmin {
  total: number;
  actifs: number;
  suspendus: number;
  bannis: number;
  supprimes: number;
}

export interface TableauBordAdmin {
  genere_le: string;
  en_ligne: EnLigneAdmin;
  comptes: ComptesAdmin;
  connexions_distinctes: ConnexionsDistinctesAdmin;
  ouvertures: OuverturesAdmin;
  appareils: AppareilsAdmin;
  comptes_par_statut: ComptesParStatutAdmin;
}

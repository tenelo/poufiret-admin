/**
 * Reflète GET/POST /administration/demandes-partenariat/ (DemandesPartenariatView).
 * La liste ne contient que les demandes statut=en_attente, triées de la plus
 * ancienne à la plus récente.
 */

export interface DemandePartenariat {
  id: number;
  nom_commerce: string;
  telephone: string;
  nom_complet: string;
  departement: string;
  type_partenaire: string;
  cree_le: string;
}

export interface ReponseDemandesPartenariat {
  total: number;
  demandes: DemandePartenariat[];
}

export type DecisionDemandePartenariat = 'accepter' | 'rejeter';

// Corps de POST /administration/demandes-partenariat/.
export interface RequeteDecisionDemandePartenariat {
  partenaire_id: number;
  decision: DecisionDemandePartenariat;
  motif?: string;
}

export interface ReponseDecisionDemandePartenariat {
  statut: string;
  id: number;
}

/**
 * Reflète GET/POST /administration/geo/rapprochement-partenaires/... (capacité
 * gerer_geographie) : rattache les partenaires n'ayant encore qu'un ancien texte
 * libre (ville/quartier) à une Localité et un Quartier de la géographie structurée.
 */

import { OptionGeo } from './geographie.model';

// Statut réel d'une ligne. "tous" n'existe que comme valeur de filtre (pas un statut de ligne).
export type StatutRapprochement = 'exact' | 'proposition' | 'aucun';
export type FiltreStatutRapprochement = StatutRapprochement | 'tous';

export interface PropositionRapprochement extends OptionGeo {
  score: number;
}

// Option de cascade (catalogue complet /geo/localites|quartiers/) à laquelle on associe le
// score quand elle correspond aussi à une proposition du backend (affichage "(score%)").
export interface OptionRapprochementAvecScore extends OptionGeo {
  score?: number;
}

export interface LigneRapprochement {
  partenaire_id: number;
  nom: string;
  departement_nom: string;
  // Id du département du partenaire, pour charger le catalogue complet des localités
  // (GET /geo/localites/?departement=<id>) — null si le partenaire n'a pas de département
  // renseigné. Nom de champ non confirmé verbatim par le backend, à vérifier lors du test
  // manuel (voir RAPPORT de ce chantier).
  departement_id: number | null;
  ville_texte: string;
  quartier_texte: string;
  // Localité/quartier déjà rattachés, le cas échéant (null si pas encore rapproché).
  localite: OptionGeo | null;
  quartier: OptionGeo | null;
  statut: StatutRapprochement;
  propositions: {
    localites: PropositionRapprochement[];
    quartiers: PropositionRapprochement[];
  };
}

export interface CompteursRapprochement {
  exact: number;
  proposition: number;
  aucun: number;
  rapproches: number;
}

export interface ReponseRapprochementPartenaires {
  resultats: LigneRapprochement[];
  compteurs: CompteursRapprochement;
}

// Corps de POST .../rapprochement-partenaires/<partenaire_id>/.
export interface RequeteValiderRapprochement {
  localite_id: number;
  quartier_id: number;
}

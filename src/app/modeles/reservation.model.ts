/**
 * Reflète /api/v1/reservations/... — demandes (visite ou réservation) faites à un partenaire
 * (loueur pour l'instant). Côté loueur : /reservations/mon-espace/. Côté admin (capacité
 * gerer_reservations) : /reservations/admin/. Aucun nom de statut n'est supposé côté interface :
 * statuts, groupes, natures et libellés viennent du backend (GET admin/meta/). Seuls les 4 codes de
 * groupe, fixés par le contrat, sont connus (a_traiter | en_cours | terminees | annulees).
 */

export type GroupeDemande = 'a_traiter' | 'en_cours' | 'terminees' | 'annulees';

export interface StatutDemandeMeta {
  valeur: string;
  libelle: string;
  groupe: string;
}

export interface GroupeDemandeMeta {
  code: string;
  libelle: string;
}

export interface NatureDemandeMeta {
  valeur: string;
  libelle: string;
}

/** GET admin/meta/. */
export interface MetaDemandes {
  statuts: StatutDemandeMeta[];
  groupes: GroupeDemandeMeta[];
  natures: NatureDemandeMeta[];
}

export interface ContactDemande {
  id: number;
  nom: string;
}

export interface TransitionPossibleDemande {
  action: string;
  libelle: string;
  commentaire_obligatoire: boolean;
}

export interface EvenementHistoriqueDemande {
  statut: string;
  acteur_nom: string | null;
  acteur_role: string | null;
  commentaire: string | null;
  cree_le: string;
}

/**
 * Ligne de GET admin/demandes/ (et de GET mon-espace/, côté loueur).
 * `transitions_possibles` : présent sur chaque demande côté loueur (mon-espace/) ; côté admin, la
 * ligne de liste ne l'expose pas (seul le détail, admin/demandes/<id>/, l'expose — voir
 * DemandeLocationDetail), d'où son caractère optionnel ici.
 */
export interface DemandeLocation {
  id: number;
  numero: string;
  nature: string;
  nature_libelle: string;
  objet_id: number;
  objet_nom: string;
  /** logement | vehicule. */
  objet_type: string;
  partenaire: number;
  partenaire_nom: string;
  client: number;
  client_nom: string;
  date_souhaitee: string | null;
  date_debut: string | null;
  date_fin: string | null;
  nb_personnes: number | null;
  message: string;
  telephone_contact: string;
  // Location de véhicule (V1) : absents ou nuls pour un logement.
  avec_chauffeur?: boolean | null;
  lieu_prise_en_charge?: string | null;
  montant_estime?: number | null;
  statut: string;
  statut_libelle: string;
  raison_refus: string | null;
  created_at: string;
  confirmee_le: string | null;
  terminee_le: string | null;
  transitions_possibles?: TransitionPossibleDemande[];
}

export interface CompteursGroupeDemandes {
  a_traiter: number;
  en_cours: number;
  terminees: number;
  annulees: number;
  total: number;
}

export interface ReponseDemandesAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: DemandeLocation[];
  compteurs_groupe: CompteursGroupeDemandes;
}

export interface NoteAdminDemande {
  id: number;
  auteur_nom: string;
  texte: string;
  cree_le: string;
}

/** GET admin/demandes/<id>/ : la ligne complète + historique et notes. */
export interface DemandeLocationDetail extends DemandeLocation {
  historique: EvenementHistoriqueDemande[];
  notes_admin: NoteAdminDemande[];
  transitions_possibles: TransitionPossibleDemande[];
}

// ---- Onglets et filtres (centre admin) ----

export type OngletDemandes = 'a_traiter' | 'en_cours' | 'terminees' | 'annulees' | 'toutes';

export const ONGLETS_DEMANDES: { valeur: OngletDemandes; libelle: string }[] = [
  { valeur: 'a_traiter', libelle: 'À traiter' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminees', libelle: 'Terminées' },
  { valeur: 'annulees', libelle: 'Annulées' },
  { valeur: 'toutes', libelle: 'Toutes' },
];

export interface FiltresDemandesAdmin {
  nature: string;
  partenaire: { id: number; nom: string } | null;
  recherche: string;
  du: string;
  au: string;
  statut: string;
}

export const FILTRES_DEMANDES_DEFAUT: FiltresDemandesAdmin = {
  nature: '',
  partenaire: null,
  recherche: '',
  du: '',
  au: '',
  statut: '',
};

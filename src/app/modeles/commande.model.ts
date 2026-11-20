/**
 * Reflète le modèle Commande exposé par le backend Django
 * (GET /orders/commandes/partenaire/, GET/POST /orders/commandes/<id>/...).
 */

export type StatutCommande =
  | 'nouvelle'
  | 'acceptee'
  | 'refusee'
  | 'en_preparation'
  | 'prete'
  | 'en_livraison'
  | 'livree'
  | 'annulee'
  | 'expiree';

export type ModeLivraisonCommande = 'emporter' | 'sur_place' | 'livraison';

export type ModePaiementCommande = 'cash' | 'mobile_money';

export interface LigneCommande {
  id: number;
  article: number | null;
  nom_article: string;
  variante_nom: string | null;
  /** [{id, nom, prix[, groupe_id, groupe_libelle]}…] : options et suppléments choisis. */
  supplements: unknown;
  quantite: number;
  prix_unitaire: string;
  prix_ligne: string;
  note_speciale: string | null;
}

export interface Commande {
  id: number;
  numero: string;
  user: number;
  client_nom: string;
  client_telephone: string;
  partenaire: number;
  partenaire_nom: string;
  mode_livraison: ModeLivraisonCommande;
  adresse: number | null;
  adresse_snapshot: Record<string, unknown> | null;
  heure_souhaitee: string | null;
  statut: StatutCommande;
  raison_refus: string | null;
  sous_total: string;
  frais_livraison: string;
  total: string;
  mode_paiement: ModePaiementCommande;
  notes_client: string | null;
  notes_partenaire: string | null;
  lignes: LigneCommande[];
  created_at: string;
  acceptee_le: string | null;
  prete_le: string | null;
  livree_le: string | null;
  /** « court » (commerces) ou « restauration » (backend). */
  parcours?: string;
  /** Statuts du parcours normal de la commande, dans l'ordre. */
  etapes?: StatutCommande[];
  transitions_possibles?: TransitionPossibleCommande[];
}

// Corps de POST /orders/commandes/<id>/transition/.
export interface RequeteTransitionCommande {
  statut: StatutCommande;
  raison_refus?: string;
}

// Filtres de GET /orders/commandes/partenaire/ : statut (existant) + date,
// en plus soit `date=today`, soit une plage `debut`/`fin` (YYYY-MM-DD).
export interface FiltresCommandesPartenaire {
  statut?: StatutCommande | '';
  date?: 'today';
  debut?: string;
  fin?: string;
}

// Réponse de GET /orders/commandes/partenaire/resume/ : sans paramètre, compteurs
// globaux (depuis le début) ; avec `?date=today` ou `?debut=&fin=`, compteurs
// recalculés sur cette période.
export interface ResumeCommandes {
  nouvelles: number;
  en_preparation: number;
  acceptees: number;
  total_aujourdhui: number;
  total: number;
  ca: number;
}

// Filtres de période seuls (sans statut), utilisés pour /resume/ qui n'accepte
// pas de filtre statut contrairement à la liste des commandes.
export type FiltresPeriode = Pick<FiltresCommandesPartenaire, 'date' | 'debut' | 'fin'>;

// Statuts actifs (nécessitent un suivi) vs finaux (historique).
export const ETATS_ACTIFS: StatutCommande[] = [
  'nouvelle',
  'acceptee',
  'en_preparation',
  'prete',
  'en_livraison',
];
export const ETATS_FINAUX: StatutCommande[] = ['livree', 'refusee', 'annulee', 'expiree'];

// Réponse de POST /orders/commandes/<id>/livreur/ : la commande n'y est pas renvoyée
// telle quelle, on rafraîchit ensuite via GET /orders/commandes/<id>/.
export interface ReponseCommanderLivreur {
  course: { numero: string; statut: string; prix: number };
  commande_statut: string;
}

export const LIBELLES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  nouvelle: 'Nouvelle',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
  expiree: 'Expirée',
};

export const LIBELLES_MODE_LIVRAISON: Record<ModeLivraisonCommande, string> = {
  emporter: 'À emporter',
  sur_place: 'Sur place',
  livraison: 'Livraison',
};

export const LIBELLES_MODE_PAIEMENT: Record<ModePaiementCommande, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
};

// Options du filtre de la liste (vide = toutes).
export const OPTIONS_FILTRE_STATUT: { valeur: StatutCommande | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'nouvelle', libelle: 'Nouvelles' },
  { valeur: 'acceptee', libelle: 'Acceptées' },
  { valeur: 'en_preparation', libelle: 'En préparation' },
  { valeur: 'prete', libelle: 'Prêtes' },
  { valeur: 'en_livraison', libelle: 'En livraison' },
  { valeur: 'livree', libelle: 'Livrées' },
  { valeur: 'refusee', libelle: 'Refusées' },
  { valeur: 'annulee', libelle: 'Annulées' },
  { valeur: 'expiree', libelle: 'Expirées' },
];

/**
 * Action proposée par le serveur pour la commande (champ `transitions_possibles`, même format que
 * le centre admin) : `action` est le statut cible envoyé à POST .../transition/ ({statut}).
 * Les boutons d'action viennent UNIQUEMENT de cette liste (parcours court ou restauration).
 */
export interface TransitionPossibleCommande {
  action: StatutCommande;
  libelle: string;
  commentaire_obligatoire: boolean;
}

/** Actions demandant une confirmation avant envoi (comportement historique conservé). */
export const ACTIONS_COMMANDE_A_CONFIRMER: readonly string[] = ['annulee', 'refusee'];

/** Le refus demande toujours un motif côté partenaire (comportement historique conservé). */
export function motifRequis(transition: TransitionPossibleCommande): boolean {
  return transition.commentaire_obligatoire || transition.action === 'refusee';
}

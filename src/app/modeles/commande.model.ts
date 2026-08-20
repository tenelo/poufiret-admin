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
}

// Corps de POST /orders/commandes/<id>/transition/.
export interface RequeteTransitionCommande {
  statut: StatutCommande;
  raison_refus?: string;
}

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

export interface ActionTransitionCommande {
  cible: StatutCommande;
  libelle: string;
  requiertMotif?: boolean;
  dangereuse?: boolean;
}

// Table des transitions autorisées côté partenaire, par statut courant.
export const TRANSITIONS_PARTENAIRE: Record<StatutCommande, ActionTransitionCommande[]> = {
  nouvelle: [
    { cible: 'acceptee', libelle: 'Accepter' },
    { cible: 'refusee', libelle: 'Refuser', requiertMotif: true, dangereuse: true },
    { cible: 'annulee', libelle: 'Annuler', dangereuse: true },
  ],
  acceptee: [
    { cible: 'en_preparation', libelle: 'Mettre en préparation' },
    { cible: 'annulee', libelle: 'Annuler', dangereuse: true },
  ],
  en_preparation: [
    { cible: 'prete', libelle: 'Marquer prête' },
    { cible: 'annulee', libelle: 'Annuler', dangereuse: true },
  ],
  prete: [
    { cible: 'en_livraison', libelle: 'Passer en livraison' },
    { cible: 'livree', libelle: 'Marquer livrée' },
    { cible: 'expiree', libelle: 'Marquer expirée' },
  ],
  en_livraison: [{ cible: 'livree', libelle: 'Marquer livrée' }],
  livree: [],
  refusee: [],
  annulee: [],
  expiree: [],
};

/**
 * Reflète le centre des commandes admin (/orders/admin/, capacité gerer_commandes).
 * Aucun nom de statut n'est supposé côté interface : statuts, groupes, libellés et actions
 * viennent du backend (GET meta/, transitions_possibles). Seuls les 4 codes de groupe, fixés par
 * le contrat, sont connus (a_traiter | en_cours | terminees | annulees).
 */

export type GroupeCommande = 'a_traiter' | 'en_cours' | 'terminees' | 'annulees';

export interface StatutCommandeMeta {
  valeur: string;
  libelle: string;
  groupe: string;
}

export interface GroupeCommandeMeta {
  code: string;
  libelle: string;
}

export interface ModeLivraisonMeta {
  valeur: string;
  libelle: string;
}

/** GET meta/. */
export interface MetaCommandes {
  statuts: StatutCommandeMeta[];
  groupes: GroupeCommandeMeta[];
  modes_livraison: ModeLivraisonMeta[];
}

export interface LivraisonCommande {
  id: number;
  statut: string;
  statut_libelle: string;
  livreur_nom: string | null;
  livreur_telephone: string | null;
}

export interface ContactCommande {
  id: number;
  nom: string;
  telephone: string;
}

export interface PartenaireCommande extends ContactCommande {
  type_partenaire: string;
  type_partenaire_libelle: string;
}

/** Ligne de GET commandes/. */
export interface CommandeAdmin {
  id: number;
  reference: string;
  cree_le: string;
  statut: string;
  statut_libelle: string;
  groupe: string;
  montant_total: number;
  nb_articles: number;
  mode_livraison: string;
  mode_livraison_libelle: string;
  client: ContactCommande;
  partenaire: PartenaireCommande;
  departement_nom: string | null;
  age_minutes: number;
  livraison: LivraisonCommande | null;
}

/** Compteurs par onglet : ignorent le groupe et le statut, respectent les autres filtres. */
export interface CompteursGroupe {
  a_traiter: number;
  en_cours: number;
  terminees: number;
  annulees: number;
  total: number;
}

export interface ReponseCommandesAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: CommandeAdmin[];
  compteurs_groupe: CompteursGroupe;
}

export interface LigneCommandeAdmin {
  article_nom: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  details: string | null;
}

export interface NoteAdmin {
  id: number;
  auteur_nom: string;
  texte: string;
  cree_le: string;
}

export interface EvenementHistorique {
  statut: string;
  statut_libelle: string;
  acteur_nom: string | null;
  acteur_role: string | null;
  commentaire: string | null;
  cree_le: string;
}

export interface TransitionPossible {
  action: string;
  libelle: string;
  commentaire_obligatoire: boolean;
}

export interface AdresseLivraison {
  texte: string;
  latitude: number | null;
  longitude: number | null;
}

/** GET commandes/<id>/ : la ligne complète + détail. */
export interface CommandeAdminDetail extends CommandeAdmin {
  lignes: LigneCommandeAdmin[];
  adresse_livraison: AdresseLivraison | null;
  note_client: string | null;
  notes_admin: NoteAdmin[];
  historique: EvenementHistorique[];
  transitions_possibles: TransitionPossible[];
  peut_demander_livreur: boolean;
}

// ---- Statistiques (GET stats/) ----

export interface KpisCommandes {
  total: number;
  a_traiter: number;
  en_cours: number;
  terminees: number;
  annulees: number;
  montant_total: number;
  panier_moyen: number;
  delai_moyen_traitement_min: number | null;
  delai_moyen_livraison_min: number | null;
  taux_annulation: number;
}

/** Répartition des commandes d'un partenaire par groupe (tous les partenaires ayant au moins une commande). */
export interface PartenaireDetailCommandes {
  id: number;
  nom: string;
  total: number;
  a_traiter: number;
  en_cours: number;
  terminees: number;
  annulees: number;
  montant: number;
}

export interface StatsCommandes {
  kpis: KpisCommandes;
  par_jour: { date: string; nb: number; montant: number }[];
  par_statut: { statut: string; libelle: string; nb: number }[];
  par_groupe: { groupe: string; libelle: string; nb: number }[];
  par_partenaire: { id: number; nom: string; nb: number; montant: number }[];
  // Triés par total décroissant ; absent tant que le backend ne le fournit pas.
  par_partenaire_detail?: PartenaireDetailCommandes[];
  par_type_partenaire: { type: string; libelle: string; nb: number; montant: number }[];
  par_client: { id: number; nom: string; nb: number; montant: number }[];
  par_mode_livraison: { mode: string; libelle: string; nb: number }[];
  par_heure: { heure: number; nb: number }[];
  par_jour_semaine: { jour: number; libelle: string; nb: number }[];
  par_departement: { id: number; nom: string; nb: number }[];
}

// ---- Onglets et filtres ----

export type OngletCommandes = 'tableau' | 'a_traiter' | 'en_cours' | 'terminees' | 'annulees' | 'toutes';

export const ONGLETS_COMMANDES: { valeur: OngletCommandes; libelle: string }[] = [
  { valeur: 'tableau', libelle: 'Tableau de bord' },
  { valeur: 'a_traiter', libelle: 'À traiter' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminees', libelle: 'Terminées' },
  { valeur: 'annulees', libelle: 'Annulées' },
  { valeur: 'toutes', libelle: 'Toutes' },
];

/** '' = toute période (liste) ou période par défaut du backend, 30 jours (tableau de bord). */
export type PeriodeCommandes = '' | 'aujourdhui' | '7j' | '30j' | 'perso';

export interface FiltresCommandesAdmin {
  periode: PeriodeCommandes;
  du: string;
  au: string;
  recherche: string;
  partenaire: { id: number; nom: string } | null;
  departement: number | '';
  mode: string;
  statut: string;
}

export const FILTRES_COMMANDES_DEFAUT: FiltresCommandesAdmin = {
  periode: '',
  du: '',
  au: '',
  recherche: '',
  partenaire: null,
  departement: '',
  mode: '',
  statut: '',
};

function formaterDateIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Bornes du/au (AAAA-MM-JJ) envoyées à l'API pour la période choisie ; vides = aucun filtre. */
export function bornesPeriode(filtres: FiltresCommandesAdmin): { du?: string; au?: string } {
  const aujourdhui = new Date();
  const ilYaJours = (n: number) => {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return formaterDateIso(date);
  };
  switch (filtres.periode) {
    case 'aujourdhui':
      return { du: formaterDateIso(aujourdhui), au: formaterDateIso(aujourdhui) };
    case '7j':
      return { du: ilYaJours(6), au: formaterDateIso(aujourdhui) };
    case '30j':
      return { du: ilYaJours(29), au: formaterDateIso(aujourdhui) };
    case 'perso':
      return { du: filtres.du || undefined, au: filtres.au || undefined };
    default:
      return {};
  }
}

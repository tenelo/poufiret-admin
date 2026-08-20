/**
 * Modèles de statistiques brutes (endpoints dédiés) et view-models agrégés
 * pour le tableau de bord partenaire.
 */

/** GET /catalogue/partenaire/stats-vues/ */
export interface StatVueArticle {
  article_id: number;
  nom: string;
  slug: string;
  est_actif: boolean;
  total: number;
  jour: number;
  semaine: number;
  mois: number;
}

export interface StatsVuesPartenaire {
  total_vues: number;
  articles: StatVueArticle[];
}

// ---- View-models agrégés, calculés par TableauDeBordPartenaireService ----

export interface PointNommee {
  libelle: string;
  valeur: number;
}

export interface VueEnsemblePartenaire {
  vuesProfil: number;
  vuesCatalogue: number;
  nbProduits: number;
  nbProduitsMax: number; // -1 = illimité
  progressionProduits: number | null; // 0-100, null si illimité
  likesCumules: number;
  commandesTotales: number;
  caLivre: number;
  planLibelle: string;
  abonnementFin: string | null;
  joursAvantExpiration: number | null; // null si pas de date (illimité)
  expirationProche: boolean; // < 15 jours (et pas déjà expiré)
  expirationDepassee: boolean;
  statutLibelle: string;
  estVisible: boolean;
  badgeCertifie: boolean;
  estFaveur: boolean;
}

export interface LigneProduitStats {
  id: number;
  nom: string;
  vuesTotal: number;
  vuesJour: number;
  vuesSemaine: number;
  vuesMois: number;
  likes: number;
  prix: string;
  estDisponible: boolean;
}

export interface VueProduitsPartenaire {
  lignes: LigneProduitStats[];
  top10ParVues: PointNommee[];
  repartitionParCategorie: PointNommee[];
}

export interface VueCommandesPartenaire {
  commandesTotales: number;
  repartitionParStatut: PointNommee[];
  caParMois: PointNommee[];
  parModeLivraison: PointNommee[];
  panierMoyen: number;
  tauxAcceptation: number | null; // pourcentage, null si non calculable
}

export interface VueTableauDeBordPartenaire {
  ensemble: VueEnsemblePartenaire;
  produits: VueProduitsPartenaire;
  commandes: VueCommandesPartenaire;
}

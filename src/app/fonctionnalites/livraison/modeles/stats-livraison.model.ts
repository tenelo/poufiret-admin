/**
 * Reflète GET /livraison/stats/bureau/ et /livraison/stats/coordonnateur/ —
 * même objet dans les deux cas. Modèle local au module livraison (isolation).
 */

export interface PeriodeStats {
  debut: string;
  fin: string;
}

export interface TauxConversionStats {
  nb_consultations: number;
  nb_courses: number;
  ratio_courses_par_consultation: number;
}

// par_jour/par_mois ne sont pas détaillés au-delà de "[...]" dans le contrat ;
// on reprend par symétrie la même forme {<unité>, total} que par_heure (seul
// point explicitement documenté).
export interface PointCaJour {
  jour: string;
  total: number;
}

export interface PointCaMois {
  mois: string;
  total: number;
}

export interface PointCaHeure {
  heure: number;
  total: number;
}

export interface CaParPeriode {
  par_jour: PointCaJour[];
  par_mois: PointCaMois[];
  par_heure: PointCaHeure[];
}

export interface RepartitionDemandeurs {
  client: number;
  partenaire: number;
  bureau: number;
}

export interface TopVille {
  ville: string;
  nb_courses: number;
}

export interface TopQuartier {
  quartier: string;
  nb_courses: number;
}

export interface TopCategoriePartenaire {
  categorie: string;
  nb_courses: number;
}

export interface StatParLivreur {
  livreur_id: string;
  livreur_nom: string;
  livreur_telephone: string;
  ville_nom: string;
  nb_courses: number;
  nb_livrees: number;
  ca_genere: number;
  taux_reussite: number;
}

export interface StatsLivraisonDonnees {
  genere_le: string;
  periode: PeriodeStats;
  taux_conversion: TauxConversionStats;
  ca_total: number;
  panier_moyen: number;
  ca_par_periode: CaParPeriode;
  repartition_demandeurs: RepartitionDemandeurs;
  top_villes: TopVille[];
  top_quartiers_depart: TopQuartier[];
  top_categories_partenaire: TopCategoriePartenaire[];
  stats_par_livreur: StatParLivreur[];
}

/**
 * Pilote les sections affichées par le composant StatsLivraison :
 * - allege (gestionnaire) : KPI + courbe CA + stats par livreur.
 * - complet (superviseur) : + répartition demandeurs, top quartiers, top catégories.
 * - coordonnateur : + top villes (comparaison multi-villes).
 */
export type ModeAffichageStats = 'allege' | 'complet' | 'coordonnateur';

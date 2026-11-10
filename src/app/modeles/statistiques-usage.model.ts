/**
 * Reflète GET /administration/statistiques-usage/<recherches|entonnoir|
 * contacts-partenaires|activite|resume>/ (capacité voir_stats, super-admin toujours
 * autorisé) : statistiques d'usage calculées côté backend à partir des recherches, des
 * événements d'app, des commandes et des vues (apps.administration.views_statistiques_usage).
 */

/** Choix de période de l'écran ; converti en `du`/`au` (YYYY-MM-DD) avant l'appel API. */
export type PeriodeUsageChoix = '7j' | '30j' | '90j' | 'perso';

/** Filtres envoyés à chaque endpoint : bornes incluses + département optionnel. */
export interface FiltresStatistiquesUsage {
  du: string;
  au: string;
  departement: number | '';
}

export interface PeriodeUsage {
  du: string;
  au: string;
  nb_jours: number;
  departement: number | null;
}

// ---- 5. Résumé (resume/) ----

export interface IndicateurResumeUsage {
  valeur: number;
  precedente: number;
  /** Variation relative (ratio) vs la période précédente ; null si la précédente est 0/null. */
  evolution: number | null;
}

export interface ResumeUsage {
  periode: PeriodeUsage;
  periode_precedente: PeriodeUsage;
  indicateurs: Record<string, IndicateurResumeUsage>;
}

// ---- 1. Recherches (recherches/) ----

export interface TotauxRecherchesUsage {
  nb: number;
  nb_avec_clic: number;
  nb_sans_resultat: number;
  nb_termes: number;
  taux_clic: number | null;
  taux_sans_resultat: number | null;
}

export interface TopTermeRechercheUsage {
  terme_normalise: string;
  nb: number;
  nb_avec_clic: number;
  nb_sans_resultat: number;
  taux_clic: number | null;
}

export interface TermeSansResultatUsage {
  terme_normalise: string;
  nb: number;
  derniere_recherche: string;
}

export interface RecherchesUsage {
  periode: PeriodeUsage;
  totaux: TotauxRecherchesUsage;
  top_termes: TopTermeRechercheUsage[];
  top_sans_resultat: TermeSansResultatUsage[];
}

// ---- 2. Entonnoir (entonnoir/) ----

export interface MotifCompteUsage {
  motif: string;
  nb: number;
}

export interface ActeurAnnulationUsage {
  acteur_role: string | null;
  nb: number;
}

export interface CategorieEntonnoirUsage {
  categorie_id: number | null;
  categorie_nom: string;
  nb_ajouts_panier: number;
  nb_paniers: number;
  nb_commandes: number;
  nb_livrees: number;
  nb_annulees: number;
  taux_conversion: number | null;
  taux_livraison: number | null;
}

export interface EntonnoirUsage {
  periode: PeriodeUsage;
  nb_ajouts_panier: number;
  nb_paniers_avec_ajout: number;
  nb_commandes: number;
  nb_livrees: number;
  nb_annulees: number;
  nb_refusees: number;
  nb_expirees: number;
  montant_livre: number;
  taux_conversion: number | null;
  taux_livraison: number | null;
  taux_annulation: number | null;
  annulations: {
    par_acteur: ActeurAnnulationUsage[];
    motifs: MotifCompteUsage[];
  };
  refus: { motifs: MotifCompteUsage[] };
  par_categorie: CategorieEntonnoirUsage[];
}

// ---- 3. Contacts partenaires (contacts-partenaires/) ----

export type TriContactsPartenairesUsage =
  | 'vues_vitrine'
  | 'appels'
  | 'whatsapp'
  | 'itineraires'
  | 'contacts'
  | 'commandes'
  | 'taux_contact_commande'
  | 'taux_vue_contact'
  | 'nom_commerce';

export interface LignePartenaireUsage {
  id: number;
  nom_commerce: string;
  type_partenaire: string;
  departement_id: number | null;
  vues_vitrine: number;
  appels: number;
  whatsapp: number;
  itineraires: number;
  contacts: number;
  commandes: number;
  taux_contact_commande: number | null;
  taux_vue_contact: number | null;
}

export interface ContactsPartenairesUsage {
  periode: PeriodeUsage;
  count: number;
  page: number;
  page_size: number;
  tri: string;
  resultats: LignePartenaireUsage[];
}

// ---- 4. Activité (activite/) ----

interface PointActiviteUsage {
  recherches: number;
  evenements: number;
  commandes: number;
  total: number;
}

export interface JourActiviteUsage extends PointActiviteUsage {
  date: string;
}

export interface HeureActiviteUsage extends PointActiviteUsage {
  heure: number;
}

export interface JourSemaineActiviteUsage extends PointActiviteUsage {
  jour: number;
  libelle: string;
}

export interface ActiviteUsage {
  periode: PeriodeUsage;
  par_jour: JourActiviteUsage[];
  par_heure: HeureActiviteUsage[];
  par_jour_semaine: JourSemaineActiviteUsage[];
  heures_de_pointe: number[];
  jour_de_pointe: string | null;
}

/**
 * Reflète GET /publicites/admin/statistiques/?du=&au=&formule=&partenaire=&portee= (capacité
 * voir_stats, défaut backend : 30 jours) : tableau de bord statistique des campagnes.
 */
import { PorteePublicite } from './publicite.model';

export interface KpisStatsPub {
  campagnes_actives: number;
  campagnes_diffusees: number;
  annonceurs: number;
  impressions: number;
  personnes_touchees: number;
  clics: number;
  // Pourcentage.
  taux_clic: number;
  // FCFA.
  revenus_estimes: number;
  campagnes_cible_atteinte: number;
}

export interface TopCampagneStats {
  id: string;
  titre: string;
  partenaire_nom: string;
  formule_nom: string;
  statut: string;
  statut_libelle: string;
  impressions: number;
  personnes_touchees: number;
  clics: number;
  taux_clic: number;
  cible_pourcentage: number | null;
  cible_atteinte: boolean;
}

export interface StatistiquesPubAdmin {
  kpis: KpisStatsPub;
  par_jour: { date: string; impressions: number; clics: number }[];
  par_type_affichage: { type: string; libelle: string; impressions: number; clics: number }[];
  par_formule: {
    id: string;
    nom: string;
    nb_campagnes: number;
    impressions: number;
    clics: number;
    taux_clic: number;
    revenus: number;
  }[];
  par_partenaire: { id: number; nom: string; nb_campagnes: number; impressions: number; clics: number }[];
  par_portee: { portee: string; libelle: string; nb_campagnes: number; impressions: number }[];
  par_heure: { heure: number; impressions: number }[];
  top_campagnes: TopCampagneStats[];
}

export type PeriodeStatsPub = '7j' | '30j' | '90j' | 'perso';

export interface FiltresStatsPub {
  periode: PeriodeStatsPub;
  du: string;
  au: string;
  formule: string;
  partenaire: { id: number; nom: string } | null;
  portee: PorteePublicite | '';
}

export const FILTRES_STATS_PUB_DEFAUT: FiltresStatsPub = {
  periode: '30j',
  du: '',
  au: '',
  formule: '',
  partenaire: null,
  portee: '',
};

function versDateIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Bornes du/au (AAAA-MM-JJ) envoyées à l'API pour la période choisie. */
export function bornesPeriodeStatsPub(filtres: FiltresStatsPub): { du?: string; au?: string } {
  if (filtres.periode === 'perso') {
    return { du: filtres.du || undefined, au: filtres.au || undefined };
  }
  const jours = filtres.periode === '7j' ? 6 : filtres.periode === '90j' ? 89 : 29;
  const debut = new Date();
  debut.setDate(debut.getDate() - jours);
  return { du: versDateIso(debut), au: versDateIso(new Date()) };
}

/**
 * Reflète GET /administration/partenaires/liste/ (lecture seule, protégé par
 * la capacité `voir_indicateurs`).
 */

export type StatutPartenaireListe = 'actif' | 'suspendu' | 'en_attente' | 'inactif';

export interface PartenaireListe {
  id: number;
  nom_commerce: string;
  type_partenaire: string;
  type_partenaire_libelle: string;
  categories: string[];
  ville: string;
  quartier: string;
  departement_nom: string;
  telephone_compte: string;
  telephone_pro: string;
  whatsapp: string;
  statut: StatutPartenaireListe;
  statut_libelle: string;
  est_visible: boolean;
  badge_certifie: boolean;
  est_faveur: boolean;
  plan_libelle: string;
  abonnement_fin: string | null;
  nb_vues: number;
  created_at: string;
}

export interface ReponsePartenairesListe {
  total: number;
  resultats: PartenaireListe[];
}

// Filtres optionnels de GET /administration/partenaires/liste/ (et son export).
export interface FiltresPartenairesListe {
  q?: string;
  type?: string;
  statut?: StatutPartenaireListe | '';
  departement?: number | '';
}

export const OPTIONS_STATUT_PARTENAIRE_LISTE: { valeur: StatutPartenaireListe | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'actif', libelle: 'Actif' },
  { valeur: 'suspendu', libelle: 'Suspendu' },
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'inactif', libelle: 'Inactif' },
];

export function classeChipStatutPartenaireListe(statut: StatutPartenaireListe): string {
  switch (statut) {
    case 'actif':
      return 'badge-actif';
    case 'suspendu':
      return 'badge-suspendu';
    case 'en_attente':
      return 'badge-en-attente';
    case 'inactif':
      return 'badge-inactif';
  }
}

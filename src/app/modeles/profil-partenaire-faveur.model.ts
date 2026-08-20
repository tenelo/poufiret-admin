/**
 * Reflète la réponse de POST/DELETE /administration/partenaires/<pk>/faveur/
 * (profil partenaire mis à jour après octroi/retrait de la faveur).
 */
export interface ProfilPartenaireFaveur {
  id: number;
  nom_commerce: string;
  plan_libelle: string;
  abonnement_fin: string | null;
  est_faveur: boolean;
  faveur_motif: string;
  statut_libelle: string;
  badge_certifie: boolean;
}

// Les 4 plans existants (codes stables) — pas d'endpoint dédié, mapping fixe côté front.
export type CodePlan = 'basique' | 'standard' | 'premium' | 'vip';

export interface OptionPlan {
  code: CodePlan;
  libelle: string;
}

export const OPTIONS_PLAN: OptionPlan[] = [
  { code: 'basique', libelle: 'Basique (gratuit)' },
  { code: 'standard', libelle: 'Standard — 2 000 FCFA' },
  { code: 'premium', libelle: 'Premium — 5 000 FCFA' },
  { code: 'vip', libelle: 'VIP — 15 000 FCFA' },
];

// Corps de POST /administration/partenaires/<pk>/faveur/.
export interface RequeteAccorderPlan {
  plan_code: CodePlan;
  motif?: string;
}

// Corps (optionnel) de DELETE /administration/partenaires/<pk>/faveur/.
export interface RequeteRetirerFaveur {
  motif?: string;
}

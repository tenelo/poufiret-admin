/**
 * Reflète GET /administration/comptes/recherche/?q=&role= et
 * POST /administration/moderation/ (super-admin uniquement).
 */

export type RoleCompte = 'client' | 'partenaire' | 'livreur' | 'admin';
export type EtatCompte = 'actif' | 'suspendu' | 'banni' | 'supprime' | 'inactif';

export interface CompteModeration {
  id: number;
  telephone: string;
  username: string;
  nom_complet: string;
  role: RoleCompte;
  role_libelle: string;
  etat: EtatCompte;
  etat_libelle: string;
  est_suspendu: boolean;
  est_banni: boolean;
  est_supprime: boolean;
  is_active: boolean;
  date_joined: string;
}

export type ActionModeration =
  | 'suspendre'
  | 'reactiver'
  | 'bannir'
  | 'supprimer_soft'
  | 'supprimer_hard'
  | 'restaurer';

// Corps de POST /administration/moderation/.
export interface RequeteModeration {
  cible_id: number;
  action: ActionModeration;
  motif?: string;
}

export interface ReponseModeration {
  detail: string;
  action: string;
}

export type GraviteAction = 'simple' | 'renforcee' | 'hard';

export interface OptionActionModeration {
  action: ActionModeration;
  libelle: string;
  gravite: GraviteAction;
}

// Actions cohérentes selon l'état courant du compte — n'afficher que celles-ci.
// "supprimer_hard" n'apparaît volontairement que depuis l'état "supprime"
// (jamais en première intention).
export const ACTIONS_PAR_ETAT: Record<EtatCompte, OptionActionModeration[]> = {
  actif: [
    { action: 'suspendre', libelle: 'Suspendre', gravite: 'renforcee' },
    { action: 'bannir', libelle: 'Bannir', gravite: 'renforcee' },
    { action: 'supprimer_soft', libelle: 'Supprimer', gravite: 'renforcee' },
  ],
  suspendu: [
    { action: 'reactiver', libelle: 'Réactiver', gravite: 'simple' },
    { action: 'bannir', libelle: 'Bannir', gravite: 'renforcee' },
    { action: 'supprimer_soft', libelle: 'Supprimer', gravite: 'renforcee' },
  ],
  banni: [
    { action: 'reactiver', libelle: 'Réactiver', gravite: 'simple' },
    { action: 'supprimer_soft', libelle: 'Supprimer', gravite: 'renforcee' },
  ],
  supprime: [
    { action: 'restaurer', libelle: 'Restaurer', gravite: 'simple' },
    { action: 'supprimer_hard', libelle: 'Supprimer définitivement', gravite: 'hard' },
  ],
  // État non couvert par la table fournie par le contrat : aucune action tant
  // que le comportement attendu n'est pas confirmé, plutôt que d'en inventer une.
  inactif: [],
};

export const OPTIONS_ROLE_FILTRE: { valeur: RoleCompte | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'client', libelle: 'Client' },
  { valeur: 'partenaire', libelle: 'Partenaire' },
  { valeur: 'livreur', libelle: 'Livreur' },
  { valeur: 'admin', libelle: 'Admin' },
];

// Résumé de conséquence affiché dans le dialog de confirmation renforcée.
export const CONSEQUENCES_ACTION: Partial<Record<ActionModeration, string>> = {
  suspendre: 'Le compte sera temporairement bloqué — il pourra être réactivé à tout moment.',
  bannir: 'Le compte ne pourra plus se connecter ni utiliser la plateforme.',
  supprimer_soft: 'Le compte sera désactivé et masqué (restaurable ensuite via "Restaurer").',
};

/**
 * Reflète GET/POST/PATCH/DELETE /administration/admins/... (gestion des
 * comptes admin par un super-admin ou un admin ayant la capacité
 * `gerer_admins`).
 */

import { NomCapacite } from './permissions-admin.model';

export interface AdminGere {
  id: number;
  telephone: string;
  username: string;
  nom_complet: string;
  role: string;
  date_joined: string;
  is_active: boolean;
  capacites: Record<string, boolean>;
}

// Corps de POST /administration/admins/creer/.
export interface RequeteCreerAdmin {
  telephone: string;
  prenom?: string;
  nom?: string;
  username?: string;
  capacites?: Partial<Record<NomCapacite, boolean>>;
}

export interface ReponseCreationAdmin {
  admin_id: number;
  telephone: string;
  username: string;
  pin_clair: string;
  message: string;
}

// Corps de PATCH /administration/admins/<id>/.
export interface RequeteModifierCapacites {
  capacites: Partial<Record<NomCapacite, boolean>>;
}

export interface CapaciteDescriptor {
  nom: NomCapacite;
  libelle: string;
  // true uniquement pour `gerer_admins` : non modifiable par un admin-gestionnaire non-superuser.
  privilegiee?: boolean;
}

export interface GroupeCapacites {
  titre: string;
  capacites: CapaciteDescriptor[];
}

// Structure d'affichage groupé des 33 capacités, réutilisée par le formulaire
// de création (capacités initiales) et l'éditeur de capacités.
export const GROUPES_CAPACITES: GroupeCapacites[] = [
  {
    titre: 'Modération — Clients',
    capacites: [
      { nom: 'suspendre_client', libelle: 'Suspendre' },
      { nom: 'reactiver_client', libelle: 'Réactiver' },
      { nom: 'bannir_client', libelle: 'Bannir' },
      { nom: 'supprimer_soft_client', libelle: 'Supprimer (soft)' },
      { nom: 'supprimer_hard_client', libelle: 'Supprimer définitivement' },
      { nom: 'restaurer_client', libelle: 'Restaurer' },
    ],
  },
  {
    titre: 'Modération — Partenaires',
    capacites: [
      { nom: 'suspendre_partenaire', libelle: 'Suspendre' },
      { nom: 'reactiver_partenaire', libelle: 'Réactiver' },
      { nom: 'bannir_partenaire', libelle: 'Bannir' },
      { nom: 'supprimer_soft_partenaire', libelle: 'Supprimer (soft)' },
      { nom: 'supprimer_hard_partenaire', libelle: 'Supprimer définitivement' },
      { nom: 'restaurer_partenaire', libelle: 'Restaurer' },
    ],
  },
  {
    titre: 'Modération — Admins',
    capacites: [
      { nom: 'suspendre_admin', libelle: 'Suspendre' },
      { nom: 'reactiver_admin', libelle: 'Réactiver' },
      { nom: 'bannir_admin', libelle: 'Bannir' },
      { nom: 'supprimer_soft_admin', libelle: 'Supprimer (soft)' },
      { nom: 'supprimer_hard_admin', libelle: 'Supprimer définitivement' },
      { nom: 'restaurer_admin', libelle: 'Restaurer' },
    ],
  },
  {
    titre: 'Partenaires',
    capacites: [
      { nom: 'masquer_partenaire', libelle: 'Masquer un partenaire' },
      { nom: 'certifier_partenaire', libelle: 'Certifier un partenaire' },
      { nom: 'accorder_faveur', libelle: 'Accorder une faveur de plan' },
      { nom: 'valider_devenir_partenaire', libelle: 'Valider une demande de partenariat' },
      { nom: 'creer_partenaire', libelle: 'Créer un partenaire' },
    ],
  },
  {
    titre: 'Publicités',
    capacites: [
      { nom: 'valider_publicite', libelle: 'Valider une publicité' },
      { nom: 'offrir_campagne', libelle: 'Offrir des crédits de campagne' },
    ],
  },
  {
    titre: 'Commandes & paiements',
    capacites: [
      { nom: 'valider_commande', libelle: 'Valider une commande' },
      { nom: 'valider_paiement', libelle: 'Valider un paiement' },
    ],
  },
  {
    titre: 'Configuration',
    capacites: [{ nom: 'modifier_plans_formules', libelle: 'Modifier les plans et formules' }],
  },
  {
    titre: 'Consultation & données',
    capacites: [
      { nom: 'voir_stats', libelle: 'Voir les statistiques' },
      { nom: 'voir_indicateurs', libelle: 'Voir les indicateurs partenaires' },
      { nom: 'lire_journal', libelle: "Lire le journal d'audit" },
      { nom: 'exporter_csv', libelle: 'Exporter en CSV' },
    ],
  },
  {
    titre: 'Gestion des admins',
    capacites: [{ nom: 'gerer_admins', libelle: 'Gérer les administrateurs', privilegiee: true }],
  },
];

/** Nombre de capacités actives dans une grille (pour l'affichage résumé de la liste). */
export function compterCapacitesActives(capacites: Record<string, boolean>): number {
  return Object.values(capacites).filter(Boolean).length;
}

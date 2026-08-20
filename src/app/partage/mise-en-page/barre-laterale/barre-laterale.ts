import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { NomCapacite } from '../../../modeles/permissions-admin.model';

interface EntreeMenuPartenaire {
  libelle: string;
  lien?: string;
}

// Entrées de menu admin : chacune déclare la capacité qui la débloque.
// Pour ajouter un écran admin, il suffit d'ajouter une ligne ici (+ sa route
// protégée par capaciteGuard) — aucune autre modification n'est nécessaire.
// Une entrée sans `capacite` (ex. Modération de comptes) est réservée au
// super-admin (is_superuser), à la place d'une capacité fine.
interface EntreeMenuAdmin {
  libelle: string;
  lien: string;
  icone: string;
  capacite?: NomCapacite;
}

const ENTREES_PARTENAIRE: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mes catégories', lien: '/mes-categories' },
  { libelle: 'Mes produits', lien: '/mes-produits' },
  { libelle: 'Mes commandes', lien: '/mes-commandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_ADMIN: EntreeMenuAdmin[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord', icone: '📊', capacite: 'voir_stats' },
  {
    libelle: 'Indicateurs partenaires',
    lien: '/administration/indicateurs-partenaires',
    icone: '📈',
    capacite: 'voir_indicateurs',
  },
  {
    libelle: 'Demandes de partenariat',
    lien: '/administration/demandes-partenariat',
    icone: '🤝',
    capacite: 'valider_devenir_partenaire',
  },
  {
    libelle: "Journal d'audit",
    lien: '/administration/journal',
    icone: '📜',
    capacite: 'lire_journal',
  },
  {
    libelle: 'Engagement clients',
    lien: '/administration/engagement-clients',
    icone: '🧑‍🤝‍🧑',
    capacite: 'voir_stats',
  },
  {
    libelle: 'Stats de connexion',
    lien: '/administration/stats-connexion',
    icone: '🔌',
    capacite: 'voir_stats',
  },
  {
    libelle: 'Publicités',
    lien: '/administration/publicites',
    icone: '📣',
    capacite: 'voir_stats',
  },
  {
    libelle: 'Crédits de pub',
    lien: '/administration/credits-pub',
    icone: '🎁',
    capacite: 'offrir_campagne',
  },
  {
    libelle: 'Faveur de plan',
    lien: '/administration/faveur-plan',
    icone: '⭐',
    capacite: 'accorder_faveur',
  },
  {
    libelle: 'Créer un partenaire',
    lien: '/administration/creer-partenaire',
    icone: '➕',
    capacite: 'creer_partenaire',
  },
  {
    libelle: 'Paiements',
    lien: '/administration/paiements',
    icone: '💳',
    capacite: 'voir_stats',
  },
  {
    // Pas de capacité : réservé au super-admin, voir le filtre ci-dessous.
    libelle: 'Modération de comptes',
    lien: '/administration/moderation',
    icone: '🛡️',
  },
  {
    // is_superuser a toujours cette capacité à true côté backend : suffit à
    // couvrir la condition "super-admin OU gerer_admins" pour le menu.
    libelle: 'Gestion des admins',
    lien: '/administration/gestion-admins',
    icone: '👥',
    capacite: 'gerer_admins',
  },
];

/**
 * Menu latéral de la coquille applicative. Les entrées affichées dépendent du
 * rôle de l'utilisateur connecté (admin vs partenaire) ; côté admin, chaque
 * entrée n'apparaît que si l'admin connecté a la capacité qu'elle requiert
 * (chargée par PermissionsService, mis en cache — voir CoquilleApplication
 * pour le déclenchement du chargement).
 */
@Component({
  selector: 'app-barre-laterale',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barre-laterale.html',
  styleUrl: './barre-laterale.scss',
})
export class BarreLaterale {
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);

  readonly estAdmin = computed(() => this.authService.role() === 'admin');

  readonly entreesPartenaire = ENTREES_PARTENAIRE;

  readonly entreesAdmin = computed<EntreeMenuAdmin[]>(() =>
    ENTREES_ADMIN.filter((entree) =>
      entree.capacite
        ? this.permissionsService.aLaCapacite(entree.capacite)
        : (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false),
    ),
  );
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { ENTREES_ADMIN, EntreeMenuAdmin } from '../../../noyau/permissions/entrees-admin';
import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';

interface EntreeMenuPartenaire {
  libelle: string;
  lien?: string;
}

// Commun à tous les partenaires. Pour un restaurateur, "Ma carte"/"Mes menus" remplacent
// "Mes catégories"/"Mes produits" (voir ENTREES_PARTENAIRE_RESTAURATEUR) — même donnée, interface
// restaurant dédiée (espace restaurant, voir fonctionnalites/restaurants/).
const ENTREES_PARTENAIRE_STANDARD: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mes catégories', lien: '/mes-categories' },
  { libelle: 'Mes produits', lien: '/mes-produits' },
  { libelle: 'Mes commandes', lien: '/mes-commandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_PARTENAIRE_RESTAURATEUR: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mon restaurant', lien: '/mon-restaurant' },
  { libelle: 'Ma carte', lien: '/ma-carte' },
  { libelle: 'Mes menus', lien: '/mes-menus' },
  { libelle: 'Mes commandes', lien: '/mes-commandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_PARTENAIRE_LOUEUR: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mes logements', lien: '/mes-logements' },
  { libelle: 'Mes demandes', lien: '/mes-demandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_PARTENAIRE_LOUEUR_VOITURE: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mes véhicules', lien: '/mes-vehicules' },
  { libelle: 'Mes demandes', lien: '/mes-demandes' },
  { libelle: 'Publicités', lien: '/publicites' },
];

const ENTREES_PARTENAIRE_HOTELIER: EntreeMenuPartenaire[] = [
  { libelle: 'Tableau de bord', lien: '/tableau-de-bord' },
  { libelle: 'Mon profil', lien: '/mon-profil' },
  { libelle: 'Mon établissement', lien: '/mon-etablissement' },
  { libelle: 'Mes hébergements', lien: '/mes-hebergements' },
  { libelle: 'Mes demandes', lien: '/mes-demandes' },
  { libelle: 'Publicités', lien: '/publicites' },
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
  private readonly profilPartenaireContexte = inject(ProfilPartenaireContexteService);

  readonly estAdmin = computed(() => this.authService.role() === 'admin');

  readonly entreesPartenaire = computed<EntreeMenuPartenaire[]>(() => {
    if (this.profilPartenaireContexte.estRestaurateur()) return ENTREES_PARTENAIRE_RESTAURATEUR;
    if (this.profilPartenaireContexte.estLoueur()) return ENTREES_PARTENAIRE_LOUEUR;
    if (this.profilPartenaireContexte.estLoueurVoiture()) return ENTREES_PARTENAIRE_LOUEUR_VOITURE;
    if (this.profilPartenaireContexte.estHotelier()) return ENTREES_PARTENAIRE_HOTELIER;
    return ENTREES_PARTENAIRE_STANDARD;
  });

  readonly entreesAdmin = computed<EntreeMenuAdmin[]>(() =>
    ENTREES_ADMIN.filter((entree) => {
      if (entree.capacite) {
        const capacites = Array.isArray(entree.capacite) ? entree.capacite : [entree.capacite];
        return capacites.some((c) => this.permissionsService.aLaCapacite(c));
      }
      if (entree.toujoursVisible) {
        return true;
      }
      return this.permissionsService.permissionsActuelles()?.isSuperuser ?? false;
    }),
  );
}

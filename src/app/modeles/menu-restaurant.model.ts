/**
 * Reflète les menus programmés d'un restaurant (P/menus/, P/lignes-menu/, où P est le préfixe
 * mon-restaurant ou admin/<partenaire_id> — voir restaurant.service.ts).
 */
import { Tracabilite } from './restaurant.model';

export type NatureMenu = 'hebdomadaire' | 'date';
export type ServiceMenu = 'midi' | 'soir' | 'journee';

export const OPTIONS_SERVICE_MENU: { valeur: ServiceMenu; libelle: string }[] = [
  { valeur: 'midi', libelle: 'Midi' },
  { valeur: 'soir', libelle: 'Soir' },
  { valeur: 'journee', libelle: 'Journée' },
];

/** ⚠ jour_semaine des MENUS : 1 à 7, 1 = lundi (différent des horaires, voir restaurant.model.ts). */
export const JOURS_MENU: { valeur: number; libelle: string }[] = [
  { valeur: 1, libelle: 'Lundi' },
  { valeur: 2, libelle: 'Mardi' },
  { valeur: 3, libelle: 'Mercredi' },
  { valeur: 4, libelle: 'Jeudi' },
  { valeur: 5, libelle: 'Vendredi' },
  { valeur: 6, libelle: 'Samedi' },
  { valeur: 7, libelle: 'Dimanche' },
];

export interface LigneMenu {
  id: number;
  menu: number;
  plat: number;
  prix_menu: number | null;
  stock_initial: number | null;
  ordre: number;
  // Lecture seule.
  // ⚠ Pas dans le contrat (qui ne donne que prix_effectif, stock_restant, est_epuise) : repli
  // défensif si le backend le fournit effectivement ; sinon le nom est résolu via la liste des
  // plats (voir DialogMenuRestaurant.nomPlat()).
  plat_nom?: string;
  prix_effectif: number;
  stock_restant: number | null;
  est_epuise: boolean;
}

export type RequeteLigneMenu = Pick<LigneMenu, 'menu' | 'plat' | 'prix_menu' | 'stock_initial' | 'ordre'>;

export interface MenuRestaurant extends Tracabilite {
  id: number;
  nature: NatureMenu;
  // Requis si nature = hebdomadaire (1-7, voir JOURS_MENU) ; null sinon.
  jour_semaine: number | null;
  // Requis si nature = date (AAAA-MM-JJ) ; null sinon.
  date: string | null;
  service: ServiceMenu;
  heure_debut: string;
  heure_fin: string;
  titre: string | null;
  publie: boolean;
  heure_limite_commande: string | null;
  // Lecture seule.
  lignes: LigneMenu[];
  commandable: boolean;
}

/** Corps de POST/PATCH P/menus/. */
export interface RequeteMenu {
  nature: NatureMenu;
  jour_semaine: number | null;
  date: string | null;
  service: ServiceMenu;
  heure_debut: string;
  heure_fin: string;
  titre: string | null;
  publie: boolean;
  heure_limite_commande: string | null;
}

/** POST P/menus/<id>/dupliquer/. */
export type RequeteDupliquerMenu = { vers_date: string } | { vers_jour_semaine: number };

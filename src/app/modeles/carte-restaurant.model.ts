/**
 * Reflète la carte d'un restaurant (addendum : P/carte/sections/, P/carte/plats/,
 * P/carte/plats/<id>/images/, P/carte/variantes/, P/carte/groupes-options/, P/carte/options/,
 * où P est le préfixe mon-restaurant ou admin/<partenaire_id>).
 *
 * Champs vérifiés en production (OPTIONS) le 2026-10-04 : plus aucune supposition ici. Toutes les
 * listes P/carte/... sont paginées ({count, next, previous, results}) — voir
 * RestaurantService.listerPaginee(). Les décimaux (prix, prix_supplement...) peuvent arriver en
 * chaîne ("3500.00") : normalisés en nombre à la lecture par le service, jamais ici.
 */
import { Tracabilite } from './restaurant.model';

// ---- Sections ----

export interface SectionCarte extends Tracabilite {
  id: number;
  partenaire: number;
  nom: string;
  description: string | null;
  icone: string | null;
  ordre: number;
  est_active: boolean;
}

export interface RequeteSectionCarte {
  nom: string;
  description?: string | null;
  icone?: string | null;
  ordre?: number;
  est_active?: boolean;
}

// ---- Plats ----
// Le lien vers la section s'appelle "section_menu" (pas "section") dans le corps de l'API.

export interface PlatCarte extends Tracabilite {
  id: number;
  partenaire: number;
  nom: string;
  slug: string;
  description: string | null;
  // FK vers une catégorie du catalogue général ; non exposée dans l'interface carte restaurant.
  categorie: number | null;
  section_menu: number | null;
  section_menu_nom?: string | null;
  prix: number;
  prix_promotion: number | null;
  // Lecture seule : prix réellement appliqué (promotion éventuelle déjà prise en compte).
  prix_effectif: number;
  est_en_promotion: boolean;
  est_actif: boolean;
  est_disponible: boolean;
  // Lecture seule : distinct de est_disponible — bascule via POST .../epuise/ {"epuise": bool}.
  est_epuise: boolean;
  est_reserve_aux_menus: boolean;
  ordre: number;
  temps_preparation_min: number | null;
  details: Record<string, unknown> | null;
  // Imbriqués en lecture dans la réponse du plat (pas besoin d'un GET séparé une fois le plat chargé).
  images: ImagePlatCarte[];
  variantes: VarianteCarte[];
  groupes_options: GroupeOptionCarte[];
}

/** Corps de POST/PATCH P/carte/plats/ : seuls les champs édités par l'écran carte restaurant. */
export interface RequetePlatCarte {
  nom: string;
  description?: string | null;
  section_menu?: number | null;
  prix: number;
  est_actif?: boolean;
  est_disponible?: boolean;
  est_reserve_aux_menus?: boolean;
  ordre?: number;
}

/** POST P/carte/plats/<id>/epuise/. */
export interface RequeteEpuise {
  epuise: boolean;
}

/** Reflète le modèle d'image du catalogue (image-article.model.ts), appliqué à un plat de carte. */
export interface ImagePlatCarte {
  id: number;
  plat: number;
  image: string;
  legende: string | null;
  ordre: number;
  est_principale: boolean;
  est_active: boolean;
}

// ---- Variantes ----
// Le lien vers le plat s'appelle "article" dans le corps (POST/PATCH), mais le filtre de liste
// reste "?plat=<id>" (à vérifier si jamais ce filtre échoue — basculer sur "?article=" alors).
//
// Règle de prix : le backend stocke prix_supplement = prix final de la variante − prix du plat.
// Le restaurateur saisit toujours le PRIX FINAL dans l'interface ; prix_supplement n'est qu'une
// valeur dérivée, calculée et envoyée par Angular (jamais saisie directement). La variante
// est_par_defaut doit avoir prix_supplement = 0 (son prix final = prix du plat).

export interface VarianteCarte {
  id: number;
  article: number;
  nom: string;
  prix_supplement: number;
  est_par_defaut: boolean;
  ordre: number;
  est_active: boolean;
}

export interface RequeteVarianteCarte {
  article: number;
  nom: string;
  prix_supplement: number;
  est_par_defaut?: boolean;
  ordre?: number;
  est_active?: boolean;
}

// ---- Groupes d'options ----
// Le lien vers le plat s'appelle "article" (comme pour les variantes).

export interface GroupeOptionCarte {
  id: number;
  article: number;
  libelle: string;
  min_choix: number | null;
  max_choix: number | null;
  ordre: number;
  est_actif: boolean;
  // Imbriquées en lecture (comme pour les plats) : pas de GET séparé nécessaire.
  options: OptionCarte[];
}

export interface RequeteGroupeOptionCarte {
  article: number;
  libelle: string;
  min_choix?: number;
  max_choix?: number;
  ordre?: number;
  est_actif?: boolean;
}

// ---- Options ----
// Le lien vers le groupe s'appelle "groupe" (confirmé). Surcoût toujours ≥ 0, affiché "+1000 F"
// (contrairement aux variantes, les options n'ont pas de notion de "prix final").

export interface OptionCarte {
  id: number;
  groupe: number;
  nom: string;
  prix_supplement: number;
  ordre: number;
  est_actif: boolean;
}

export interface RequeteOptionCarte {
  groupe: number;
  nom: string;
  prix_supplement?: number;
  ordre?: number;
  est_actif?: boolean;
}

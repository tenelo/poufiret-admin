import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import {
  FicheRestaurant,
  RequeteFiche,
  RequeteHoraires,
  RequeteTelephone,
  TelephoneRestaurant,
} from '../../modeles/restaurant.model';
import {
  MenuRestaurant,
  RequeteDupliquerMenu,
  RequeteLigneMenu,
  RequeteMenu,
  LigneMenu,
} from '../../modeles/menu-restaurant.model';
import {
  GroupeOptionCarte,
  ImagePlatCarte,
  OptionCarte,
  PlatCarte,
  RequeteEpuise,
  RequeteGroupeOptionCarte,
  RequeteOptionCarte,
  RequetePlatCarte,
  RequeteSectionCarte,
  RequeteVarianteCarte,
  SectionCarte,
  VarianteCarte,
} from '../../modeles/carte-restaurant.model';
import {
  ReponseRestaurantsAdminListe,
  RestaurantAdminListe,
} from '../../modeles/restaurant-admin-liste.model';
import { ReponsePaginee } from '../../modeles/pagination.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

// Taille de page pour les listes P/carte/... (toutes paginées) : au-delà, on suit `next`.
const TAILLE_PAGE_CARTE = 100;

/** Un prix (ou un supplément) peut arriver en chaîne ("3500.00") côté backend : normalisé ici. */
function versNombre(valeur: unknown): number {
  return Number(valeur);
}

function versNombreOuNull(valeur: unknown): number | null {
  return valeur === null || valeur === undefined ? null : Number(valeur);
}

function normaliserVariante(v: VarianteCarte): VarianteCarte {
  return { ...v, prix_supplement: versNombre(v.prix_supplement) };
}

function normaliserOption(o: OptionCarte): OptionCarte {
  return { ...o, prix_supplement: versNombre(o.prix_supplement) };
}

function normaliserGroupe(g: GroupeOptionCarte): GroupeOptionCarte {
  return { ...g, options: (g.options ?? []).map(normaliserOption) };
}

function normaliserPlat(p: PlatCarte): PlatCarte {
  return {
    ...p,
    prix: versNombre(p.prix),
    prix_promotion: versNombreOuNull(p.prix_promotion),
    prix_effectif: versNombre(p.prix_effectif),
    variantes: (p.variantes ?? []).map(normaliserVariante),
    groupes_options: (p.groupes_options ?? []).map(normaliserGroupe),
  };
}

/** Préfixe "mon-restaurant" (restaurateur) ou "admin/<partenaire_id>" (admin, n'importe quel restaurant). */
export type PrefixeRestaurant = string;

export function prefixeAdmin(partenaireId: number | string): PrefixeRestaurant {
  return `admin/${partenaireId}`;
}

export const PREFIXE_MON_RESTAURANT: PrefixeRestaurant = 'mon-restaurant';

/**
 * Service unique de l'espace restaurant, paramétré par un préfixe (mon-restaurant côté
 * restaurateur, admin/<partenaire_id> côté admin) : même backend, même interface des deux côtés.
 * Aucune duplication entre les deux usages.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private base(prefixe: PrefixeRestaurant): string {
    return `${this.configuration.apiUrl}/restaurants/${prefixe}/`;
  }

  /** Récupère la totalité d'une liste P/carte/... en bouclant sur `next` (page_size=100). */
  private listerPaginee<T>(url: string, params: HttpParams = new HttpParams()): Observable<T[]> {
    const parametres = params.set('page_size', TAILLE_PAGE_CARTE);
    return this.http.get<ReponsePaginee<T>>(url, { params: parametres }).pipe(
      expand((reponse) => (reponse.next ? this.http.get<ReponsePaginee<T>>(reponse.next) : EMPTY)),
      reduce<ReponsePaginee<T>, T[]>((tous, reponse) => [...tous, ...reponse.results], []),
    );
  }

  // ---- Fiche & horaires ----

  chargerFiche(prefixe: PrefixeRestaurant): Observable<FicheRestaurant> {
    return this.http.get<FicheRestaurant>(`${this.base(prefixe)}fiche/`);
  }

  modifierFiche(prefixe: PrefixeRestaurant, donnees: RequeteFiche): Observable<FicheRestaurant> {
    return this.http.patch<FicheRestaurant>(`${this.base(prefixe)}fiche/`, donnees);
  }

  modifierHoraires(prefixe: PrefixeRestaurant, donnees: RequeteHoraires): Observable<FicheRestaurant> {
    return this.http.put<FicheRestaurant>(`${this.base(prefixe)}horaires/`, donnees);
  }

  // ---- Téléphones ----

  listerTelephones(prefixe: PrefixeRestaurant): Observable<TelephoneRestaurant[]> {
    return this.http
      .get<ReponseListe<TelephoneRestaurant>>(`${this.base(prefixe)}telephones/`)
      .pipe(map(normaliserListe));
  }

  creerTelephone(prefixe: PrefixeRestaurant, donnees: RequeteTelephone): Observable<TelephoneRestaurant> {
    return this.http.post<TelephoneRestaurant>(`${this.base(prefixe)}telephones/`, donnees);
  }

  modifierTelephone(
    prefixe: PrefixeRestaurant,
    id: number,
    donnees: Partial<RequeteTelephone>,
  ): Observable<TelephoneRestaurant> {
    return this.http.patch<TelephoneRestaurant>(`${this.base(prefixe)}telephones/${id}/`, donnees);
  }

  supprimerTelephone(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}telephones/${id}/`);
  }

  // ---- Menus ----

  listerMenus(
    prefixe: PrefixeRestaurant,
    filtres: { nature?: string; service?: string; publie?: boolean } = {},
  ): Observable<MenuRestaurant[]> {
    let params = new HttpParams();
    if (filtres.nature) params = params.set('nature', filtres.nature);
    if (filtres.service) params = params.set('service', filtres.service);
    if (filtres.publie !== undefined) params = params.set('publie', String(filtres.publie));
    return this.http
      .get<ReponseListe<MenuRestaurant>>(`${this.base(prefixe)}menus/`, { params })
      .pipe(map(normaliserListe));
  }

  creerMenu(prefixe: PrefixeRestaurant, donnees: RequeteMenu): Observable<MenuRestaurant> {
    return this.http.post<MenuRestaurant>(`${this.base(prefixe)}menus/`, donnees);
  }

  modifierMenu(prefixe: PrefixeRestaurant, id: number, donnees: Partial<RequeteMenu>): Observable<MenuRestaurant> {
    return this.http.patch<MenuRestaurant>(`${this.base(prefixe)}menus/${id}/`, donnees);
  }

  supprimerMenu(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}menus/${id}/`);
  }

  dupliquerMenu(prefixe: PrefixeRestaurant, id: number, donnees: RequeteDupliquerMenu): Observable<MenuRestaurant> {
    return this.http.post<MenuRestaurant>(`${this.base(prefixe)}menus/${id}/dupliquer/`, donnees);
  }

  copierSemaine(prefixe: PrefixeRestaurant): Observable<unknown> {
    return this.http.post(`${this.base(prefixe)}menus/copier-semaine/`, {});
  }

  // ---- Lignes de menu ----

  listerLignesMenu(prefixe: PrefixeRestaurant, menuId: number): Observable<LigneMenu[]> {
    const params = new HttpParams().set('menu', menuId);
    return this.http
      .get<ReponseListe<LigneMenu>>(`${this.base(prefixe)}lignes-menu/`, { params })
      .pipe(map(normaliserListe));
  }

  creerLigneMenu(prefixe: PrefixeRestaurant, donnees: RequeteLigneMenu): Observable<LigneMenu> {
    return this.http.post<LigneMenu>(`${this.base(prefixe)}lignes-menu/`, donnees);
  }

  modifierLigneMenu(
    prefixe: PrefixeRestaurant,
    id: number,
    donnees: Partial<RequeteLigneMenu>,
  ): Observable<LigneMenu> {
    return this.http.patch<LigneMenu>(`${this.base(prefixe)}lignes-menu/${id}/`, donnees);
  }

  supprimerLigneMenu(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}lignes-menu/${id}/`);
  }

  // ---- Carte : sections ----

  listerSections(prefixe: PrefixeRestaurant): Observable<SectionCarte[]> {
    return this.listerPaginee<SectionCarte>(`${this.base(prefixe)}carte/sections/`);
  }

  creerSection(prefixe: PrefixeRestaurant, donnees: RequeteSectionCarte): Observable<SectionCarte> {
    return this.http.post<SectionCarte>(`${this.base(prefixe)}carte/sections/`, donnees);
  }

  modifierSection(
    prefixe: PrefixeRestaurant,
    id: number,
    donnees: Partial<RequeteSectionCarte>,
  ): Observable<SectionCarte> {
    return this.http.patch<SectionCarte>(`${this.base(prefixe)}carte/sections/${id}/`, donnees);
  }

  supprimerSection(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}carte/sections/${id}/`);
  }

  // ---- Carte : plats ----
  // Les images, variantes et groupes d'options (avec leurs options) arrivent imbriqués en lecture
  // dans chaque plat : pas besoin d'appels séparés une fois le plat chargé (voir obtenirPlat()).

  listerPlats(
    prefixe: PrefixeRestaurant,
    filtres: { section?: number; reserve_aux_menus?: boolean } = {},
  ): Observable<PlatCarte[]> {
    let params = new HttpParams();
    if (filtres.section !== undefined) params = params.set('section', filtres.section);
    if (filtres.reserve_aux_menus !== undefined) {
      params = params.set('reserve_aux_menus', String(filtres.reserve_aux_menus));
    }
    return this.listerPaginee<PlatCarte>(`${this.base(prefixe)}carte/plats/`, params).pipe(
      map((plats) => plats.map(normaliserPlat)),
    );
  }

  /** GET carte/plats/<id>/ : relit un plat (images/variantes/groupes_options à jour). */
  obtenirPlat(prefixe: PrefixeRestaurant, id: number): Observable<PlatCarte> {
    return this.http
      .get<PlatCarte>(`${this.base(prefixe)}carte/plats/${id}/`)
      .pipe(map(normaliserPlat));
  }

  creerPlat(prefixe: PrefixeRestaurant, donnees: RequetePlatCarte): Observable<PlatCarte> {
    return this.http.post<PlatCarte>(`${this.base(prefixe)}carte/plats/`, donnees).pipe(map(normaliserPlat));
  }

  modifierPlat(prefixe: PrefixeRestaurant, id: number, donnees: Partial<RequetePlatCarte>): Observable<PlatCarte> {
    return this.http
      .patch<PlatCarte>(`${this.base(prefixe)}carte/plats/${id}/`, donnees)
      .pipe(map(normaliserPlat));
  }

  supprimerPlat(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}carte/plats/${id}/`);
  }

  basculerEpuise(prefixe: PrefixeRestaurant, id: number, donnees: RequeteEpuise): Observable<PlatCarte> {
    return this.http
      .post<PlatCarte>(`${this.base(prefixe)}carte/plats/${id}/epuise/`, donnees)
      .pipe(map(normaliserPlat));
  }

  // ---- Carte : images des plats ----

  listerImagesPlat(prefixe: PrefixeRestaurant, platId: number): Observable<ImagePlatCarte[]> {
    return this.listerPaginee<ImagePlatCarte>(`${this.base(prefixe)}carte/plats/${platId}/images/`);
  }

  ajouterImagePlat(
    prefixe: PrefixeRestaurant,
    platId: number,
    fichier: File,
    options: { estPrincipale?: boolean } = {},
  ): Observable<ImagePlatCarte> {
    const formData = new FormData();
    formData.append('plat', String(platId));
    formData.append('image', fichier);
    if (options.estPrincipale !== undefined) formData.append('est_principale', String(options.estPrincipale));
    return this.http.post<ImagePlatCarte>(`${this.base(prefixe)}carte/plats/${platId}/images/`, formData);
  }

  supprimerImagePlat(prefixe: PrefixeRestaurant, platId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}carte/plats/${platId}/images/${imageId}/`);
  }

  definirImagePrincipale(
    prefixe: PrefixeRestaurant,
    platId: number,
    imageId: number,
    estPrincipale: boolean,
  ): Observable<ImagePlatCarte> {
    return this.http.patch<ImagePlatCarte>(`${this.base(prefixe)}carte/plats/${platId}/images/${imageId}/`, {
      est_principale: estPrincipale,
    });
  }

  /** Met à jour l'ordre d'affichage d'une image de plat (glisser-déposer). */
  definirOrdreImagePlat(
    prefixe: PrefixeRestaurant,
    platId: number,
    imageId: number,
    ordre: number,
  ): Observable<ImagePlatCarte> {
    return this.http.patch<ImagePlatCarte>(`${this.base(prefixe)}carte/plats/${platId}/images/${imageId}/`, {
      ordre,
    });
  }

  // ---- Carte : variantes ----
  // Corps : "article" = id du plat. Filtre de liste : "?plat=" (à essayer "?article=" en repli si
  // le backend le refuse — voir carte-restaurant.model.ts).

  listerVariantes(prefixe: PrefixeRestaurant, platId: number): Observable<VarianteCarte[]> {
    const params = new HttpParams().set('plat', platId);
    return this.listerPaginee<VarianteCarte>(`${this.base(prefixe)}carte/variantes/`, params).pipe(
      map((variantes) => variantes.map(normaliserVariante)),
    );
  }

  creerVariante(prefixe: PrefixeRestaurant, donnees: RequeteVarianteCarte): Observable<VarianteCarte> {
    return this.http
      .post<VarianteCarte>(`${this.base(prefixe)}carte/variantes/`, donnees)
      .pipe(map(normaliserVariante));
  }

  modifierVariante(
    prefixe: PrefixeRestaurant,
    id: number,
    donnees: Partial<RequeteVarianteCarte>,
  ): Observable<VarianteCarte> {
    return this.http
      .patch<VarianteCarte>(`${this.base(prefixe)}carte/variantes/${id}/`, donnees)
      .pipe(map(normaliserVariante));
  }

  supprimerVariante(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}carte/variantes/${id}/`);
  }

  // ---- Carte : groupes d'options ----
  // Corps : "article" = id du plat (comme pour les variantes).

  listerGroupesOptions(prefixe: PrefixeRestaurant, platId: number): Observable<GroupeOptionCarte[]> {
    const params = new HttpParams().set('plat', platId);
    return this.listerPaginee<GroupeOptionCarte>(`${this.base(prefixe)}carte/groupes-options/`, params).pipe(
      map((groupes) => groupes.map(normaliserGroupe)),
    );
  }

  creerGroupeOptions(prefixe: PrefixeRestaurant, donnees: RequeteGroupeOptionCarte): Observable<GroupeOptionCarte> {
    return this.http
      .post<GroupeOptionCarte>(`${this.base(prefixe)}carte/groupes-options/`, donnees)
      .pipe(map(normaliserGroupe));
  }

  modifierGroupeOptions(
    prefixe: PrefixeRestaurant,
    id: number,
    donnees: Partial<RequeteGroupeOptionCarte>,
  ): Observable<GroupeOptionCarte> {
    return this.http
      .patch<GroupeOptionCarte>(`${this.base(prefixe)}carte/groupes-options/${id}/`, donnees)
      .pipe(map(normaliserGroupe));
  }

  supprimerGroupeOptions(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}carte/groupes-options/${id}/`);
  }

  // ---- Carte : options ----
  // Corps : "groupe" = id du groupe d'options (confirmé, inchangé).

  listerOptions(prefixe: PrefixeRestaurant, groupeId: number): Observable<OptionCarte[]> {
    const params = new HttpParams().set('groupe', groupeId);
    return this.listerPaginee<OptionCarte>(`${this.base(prefixe)}carte/options/`, params).pipe(
      map((options) => options.map(normaliserOption)),
    );
  }

  creerOption(prefixe: PrefixeRestaurant, donnees: RequeteOptionCarte): Observable<OptionCarte> {
    return this.http
      .post<OptionCarte>(`${this.base(prefixe)}carte/options/`, donnees)
      .pipe(map(normaliserOption));
  }

  modifierOption(prefixe: PrefixeRestaurant, id: number, donnees: Partial<RequeteOptionCarte>): Observable<OptionCarte> {
    return this.http
      .patch<OptionCarte>(`${this.base(prefixe)}carte/options/${id}/`, donnees)
      .pipe(map(normaliserOption));
  }

  supprimerOption(prefixe: PrefixeRestaurant, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}carte/options/${id}/`);
  }

  // ---- Admin : liste des restaurants ----

  /**
   * GET /restaurants/admin/ : liste complète (pas de pagination, pas de recherche serveur) — la
   * recherche et le filtre par département se font côté client dans RestaurantsListe.
   */
  listerRestaurantsAdmin(): Observable<RestaurantAdminListe[]> {
    return this.http
      .get<ReponseRestaurantsAdminListe>(`${this.configuration.apiUrl}/restaurants/admin/`)
      .pipe(map((reponse) => reponse.resultats));
  }
}

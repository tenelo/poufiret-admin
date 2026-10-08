import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import { Departement } from '../../modeles/departement.model';
import { ReponseLocationMeta } from '../../modeles/location-meta.model';
import {
  ImageLogement,
  Logement,
  LoueurAdminListe,
  PanoramaLogement,
  ReponseLogements,
  ReponseLoueursAdmin,
  RequeteDisponibiliteLogement,
  RequeteLogement,
  TypeVuePanorama,
} from '../../modeles/logement.model';
import { BienLocation, RequeteDisponibiliteBien } from '../../modeles/bien-location.model';
import { Etablissement, RequeteEtablissement } from '../../modeles/hebergement.model';

/** Préfixe "mon-espace" (loueur) ou "admin/<partenaire_id>" (admin, n'importe quel loueur). */
export type PrefixeLocation = string;

export function prefixeAdminLocation(partenaireId: number | string): PrefixeLocation {
  return `admin/${partenaireId}`;
}

export const PREFIXE_MON_ESPACE_LOCATION: PrefixeLocation = 'mon-espace';

/** Ressource portant images et panoramas : mêmes routes pour tous les biens. */
export type RessourceLocation = 'logements' | 'vehicules' | 'hebergements';

/** Biens gérés par le socle commun OngletBiensBase / DialogBienBase. */
export type RessourceBien = 'vehicules' | 'hebergements';

/**
 * Service unique de l'espace loueur, paramétré par un préfixe (mon-espace côté loueur,
 * admin/<partenaire_id> côté admin) : même backend, même interface des deux côtés — comme
 * RestaurantService pour l'espace restaurant. Aucune duplication entre les deux usages.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private base(prefixe: PrefixeLocation): string {
    return `${this.configuration.apiUrl}/locations/${prefixe}/`;
  }

  /** GET /locations/meta/ : référentiels (types de logement, équipements, disponibilités). */
  meta(): Observable<ReponseLocationMeta> {
    return this.http.get<ReponseLocationMeta>(`${this.configuration.apiUrl}/locations/meta/`);
  }

  /** GET /geo/departements/ : peuple le sélecteur de département de la cascade de localisation. */
  listerDepartements(): Observable<Departement[]> {
    return this.http
      .get<Departement[] | { results: Departement[] }>(`${this.configuration.apiUrl}/geo/departements/`)
      .pipe(map((reponse) => (Array.isArray(reponse) ? reponse : reponse.results)));
  }

  // ---- Logements ----

  listerLogements(prefixe: PrefixeLocation, disponibilite?: string): Observable<Logement[]> {
    let params = new HttpParams();
    if (disponibilite) {
      params = params.set('disponibilite', disponibilite);
    }
    return this.http
      .get<ReponseLogements>(`${this.base(prefixe)}logements/`, { params })
      .pipe(map((reponse) => reponse.resultats));
  }

  obtenirLogement(prefixe: PrefixeLocation, id: number): Observable<Logement> {
    return this.http.get<Logement>(`${this.base(prefixe)}logements/${id}/`);
  }

  creerLogement(prefixe: PrefixeLocation, donnees: RequeteLogement): Observable<Logement> {
    return this.http.post<Logement>(`${this.base(prefixe)}logements/`, donnees);
  }

  modifierLogement(prefixe: PrefixeLocation, id: number, donnees: Partial<RequeteLogement>): Observable<Logement> {
    return this.http.patch<Logement>(`${this.base(prefixe)}logements/${id}/`, donnees);
  }

  supprimerLogement(prefixe: PrefixeLocation, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}logements/${id}/`);
  }

  changerDisponibilite(
    prefixe: PrefixeLocation,
    id: number,
    donnees: RequeteDisponibiliteLogement,
  ): Observable<Logement> {
    return this.http.post<Logement>(`${this.base(prefixe)}logements/${id}/disponibilite/`, donnees);
  }

  // ---- Biens à la journée/nuit : véhicules (loueur_voiture) et hébergements (hotelier) ----
  // Mêmes routes pour les deux ressources (et mêmes conventions que les logements) ; le type T est
  // Vehicule ou Hebergement, la requête RequeteVehicule ou RequeteHebergement.

  listerBiens<T extends BienLocation>(
    prefixe: PrefixeLocation,
    ressource: RessourceBien,
    disponibilite?: string,
  ): Observable<T[]> {
    let params = new HttpParams();
    if (disponibilite) {
      params = params.set('disponibilite', disponibilite);
    }
    return this.http
      .get<{ resultats: T[] }>(`${this.base(prefixe)}${ressource}/`, { params })
      .pipe(map((reponse) => reponse.resultats));
  }

  creerBien<T extends BienLocation>(
    prefixe: PrefixeLocation,
    ressource: RessourceBien,
    donnees: object,
  ): Observable<T> {
    return this.http.post<T>(`${this.base(prefixe)}${ressource}/`, donnees);
  }

  modifierBien<T extends BienLocation>(
    prefixe: PrefixeLocation,
    ressource: RessourceBien,
    id: number,
    donnees: object,
  ): Observable<T> {
    return this.http.patch<T>(`${this.base(prefixe)}${ressource}/${id}/`, donnees);
  }

  /** 409 si le bien a des demandes : proposer alors de le désactiver. */
  supprimerBien(prefixe: PrefixeLocation, ressource: RessourceBien, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}${ressource}/${id}/`);
  }

  changerDisponibiliteBien<T extends BienLocation>(
    prefixe: PrefixeLocation,
    ressource: RessourceBien,
    id: number,
    donnees: RequeteDisponibiliteBien,
  ): Observable<T> {
    return this.http.post<T>(`${this.base(prefixe)}${ressource}/${id}/disponibilite/`, donnees);
  }

  // ---- Établissement (hotelier) : fiche unique ----

  obtenirEtablissement(prefixe: PrefixeLocation): Observable<Etablissement> {
    return this.http.get<Etablissement>(`${this.base(prefixe)}etablissement/`);
  }

  modifierEtablissement(prefixe: PrefixeLocation, donnees: RequeteEtablissement): Observable<Etablissement> {
    return this.http.patch<Etablissement>(`${this.base(prefixe)}etablissement/`, donnees);
  }

  // ---- Images des logements, véhicules et hébergements (ressource) ----
  // Corps multipart : "article" = id du bien (même convention que les images de
  // plats/produits).

  listerImagesLogement(
    prefixe: PrefixeLocation,
    objetId: number,
    ressource: RessourceLocation = 'logements',
  ): Observable<ImageLogement[]> {
    return this.http
      .get<{ resultats: ImageLogement[] }>(`${this.base(prefixe)}${ressource}/${objetId}/images/`)
      .pipe(map((reponse) => reponse.resultats));
  }

  ajouterImageLogement(
    prefixe: PrefixeLocation,
    objetId: number,
    fichier: File,
    options: { estPrincipale?: boolean } = {},
    ressource: RessourceLocation = 'logements',
  ): Observable<ImageLogement> {
    const formData = new FormData();
    formData.append('article', String(objetId));
    formData.append('image', fichier);
    if (options.estPrincipale !== undefined) {
      formData.append('est_principale', String(options.estPrincipale));
    }
    return this.http.post<ImageLogement>(`${this.base(prefixe)}${ressource}/${objetId}/images/`, formData);
  }

  modifierImageLogement(
    prefixe: PrefixeLocation,
    objetId: number,
    imageId: number,
    donnees: { est_principale?: boolean; ordre?: number },
    ressource: RessourceLocation = 'logements',
  ): Observable<ImageLogement> {
    return this.http.patch<ImageLogement>(`${this.base(prefixe)}${ressource}/${objetId}/images/${imageId}/`, donnees);
  }

  supprimerImageLogement(
    prefixe: PrefixeLocation,
    objetId: number,
    imageId: number,
    ressource: RessourceLocation = 'logements',
  ): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}${ressource}/${objetId}/images/${imageId}/`);
  }

  // ---- Panoramas (visite immersive) ----
  // Corps multipart : "article" = id du bien, "image", "titre", "type_vue", "ordre".

  listerPanoramas(
    prefixe: PrefixeLocation,
    objetId: number,
    ressource: RessourceLocation = 'logements',
  ): Observable<PanoramaLogement[]> {
    return this.http
      .get<{
        resultats: PanoramaLogement[];
      }>(`${this.base(prefixe)}${ressource}/${objetId}/panoramas/`)
      .pipe(map((reponse) => reponse.resultats));
  }

  ajouterPanorama(
    prefixe: PrefixeLocation,
    objetId: number,
    fichier: File,
    donnees: { titre: string; type_vue: TypeVuePanorama },
    ressource: RessourceLocation = 'logements',
  ): Observable<PanoramaLogement> {
    const formData = new FormData();
    formData.append('article', String(objetId));
    formData.append('image', fichier);
    formData.append('titre', donnees.titre);
    formData.append('type_vue', donnees.type_vue);
    return this.http.post<PanoramaLogement>(`${this.base(prefixe)}${ressource}/${objetId}/panoramas/`, formData);
  }

  modifierPanorama(
    prefixe: PrefixeLocation,
    objetId: number,
    panoramaId: number,
    donnees: { titre?: string; type_vue?: TypeVuePanorama; ordre?: number },
    ressource: RessourceLocation = 'logements',
  ): Observable<PanoramaLogement> {
    return this.http.patch<PanoramaLogement>(
      `${this.base(prefixe)}${ressource}/${objetId}/panoramas/${panoramaId}/`,
      donnees,
    );
  }

  supprimerPanorama(
    prefixe: PrefixeLocation,
    objetId: number,
    panoramaId: number,
    ressource: RessourceLocation = 'logements',
  ): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}${ressource}/${objetId}/panoramas/${panoramaId}/`);
  }

  // ---- Admin : liste des loueurs ----

  listerLoueursAdmin(): Observable<LoueurAdminListe[]> {
    return this.http
      .get<ReponseLoueursAdmin>(`${this.configuration.apiUrl}/locations/admin/`)
      .pipe(map((reponse) => reponse.resultats));
  }
}

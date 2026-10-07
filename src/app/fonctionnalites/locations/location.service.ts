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

/** Préfixe "mon-espace" (loueur) ou "admin/<partenaire_id>" (admin, n'importe quel loueur). */
export type PrefixeLocation = string;

export function prefixeAdminLocation(partenaireId: number | string): PrefixeLocation {
  return `admin/${partenaireId}`;
}

export const PREFIXE_MON_ESPACE_LOCATION: PrefixeLocation = 'mon-espace';

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

  // ---- Images des logements ----
  // Corps multipart : "article" = id du logement (même convention que les images de plats/produits).

  listerImagesLogement(prefixe: PrefixeLocation, logementId: number): Observable<ImageLogement[]> {
    return this.http
      .get<{ resultats: ImageLogement[] }>(`${this.base(prefixe)}logements/${logementId}/images/`)
      .pipe(map((reponse) => reponse.resultats));
  }

  ajouterImageLogement(
    prefixe: PrefixeLocation,
    logementId: number,
    fichier: File,
    options: { estPrincipale?: boolean } = {},
  ): Observable<ImageLogement> {
    const formData = new FormData();
    formData.append('article', String(logementId));
    formData.append('image', fichier);
    if (options.estPrincipale !== undefined) {
      formData.append('est_principale', String(options.estPrincipale));
    }
    return this.http.post<ImageLogement>(`${this.base(prefixe)}logements/${logementId}/images/`, formData);
  }

  modifierImageLogement(
    prefixe: PrefixeLocation,
    logementId: number,
    imageId: number,
    donnees: { est_principale?: boolean; ordre?: number },
  ): Observable<ImageLogement> {
    return this.http.patch<ImageLogement>(
      `${this.base(prefixe)}logements/${logementId}/images/${imageId}/`,
      donnees,
    );
  }

  supprimerImageLogement(prefixe: PrefixeLocation, logementId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}logements/${logementId}/images/${imageId}/`);
  }

  // ---- Panoramas (visite immersive) ----
  // Corps multipart : "article" = id du logement, "image", "titre", "type_vue", "ordre".

  listerPanoramas(prefixe: PrefixeLocation, logementId: number): Observable<PanoramaLogement[]> {
    return this.http
      .get<{ resultats: PanoramaLogement[] }>(`${this.base(prefixe)}logements/${logementId}/panoramas/`)
      .pipe(map((reponse) => reponse.resultats));
  }

  ajouterPanorama(
    prefixe: PrefixeLocation,
    logementId: number,
    fichier: File,
    donnees: { titre: string; type_vue: TypeVuePanorama },
  ): Observable<PanoramaLogement> {
    const formData = new FormData();
    formData.append('article', String(logementId));
    formData.append('image', fichier);
    formData.append('titre', donnees.titre);
    formData.append('type_vue', donnees.type_vue);
    return this.http.post<PanoramaLogement>(`${this.base(prefixe)}logements/${logementId}/panoramas/`, formData);
  }

  modifierPanorama(
    prefixe: PrefixeLocation,
    logementId: number,
    panoramaId: number,
    donnees: { titre?: string; type_vue?: TypeVuePanorama; ordre?: number },
  ): Observable<PanoramaLogement> {
    return this.http.patch<PanoramaLogement>(
      `${this.base(prefixe)}logements/${logementId}/panoramas/${panoramaId}/`,
      donnees,
    );
  }

  supprimerPanorama(prefixe: PrefixeLocation, logementId: number, panoramaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}logements/${logementId}/panoramas/${panoramaId}/`);
  }

  // ---- Admin : liste des loueurs ----

  listerLoueursAdmin(): Observable<LoueurAdminListe[]> {
    return this.http
      .get<ReponseLoueursAdmin>(`${this.configuration.apiUrl}/locations/admin/`)
      .pipe(map((reponse) => reponse.resultats));
  }
}

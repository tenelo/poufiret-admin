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
import {
  ReponseVehicules,
  RequeteDisponibiliteVehicule,
  RequeteVehicule,
  Vehicule,
} from '../../modeles/vehicule.model';

/** Préfixe "mon-espace" (loueur) ou "admin/<partenaire_id>" (admin, n'importe quel loueur). */
export type PrefixeLocation = string;

export function prefixeAdminLocation(partenaireId: number | string): PrefixeLocation {
  return `admin/${partenaireId}`;
}

export const PREFIXE_MON_ESPACE_LOCATION: PrefixeLocation = 'mon-espace';

/** Ressource portant images et panoramas : mêmes routes pour les logements et les véhicules. */
export type RessourceLocation = 'logements' | 'vehicules';

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

  // ---- Véhicules (loueur_voiture) : mêmes conventions que les logements ----

  listerVehicules(prefixe: PrefixeLocation, disponibilite?: string): Observable<Vehicule[]> {
    let params = new HttpParams();
    if (disponibilite) {
      params = params.set('disponibilite', disponibilite);
    }
    return this.http
      .get<ReponseVehicules>(`${this.base(prefixe)}vehicules/`, { params })
      .pipe(map((reponse) => reponse.resultats));
  }

  obtenirVehicule(prefixe: PrefixeLocation, id: number): Observable<Vehicule> {
    return this.http.get<Vehicule>(`${this.base(prefixe)}vehicules/${id}/`);
  }

  creerVehicule(prefixe: PrefixeLocation, donnees: RequeteVehicule): Observable<Vehicule> {
    return this.http.post<Vehicule>(`${this.base(prefixe)}vehicules/`, donnees);
  }

  modifierVehicule(prefixe: PrefixeLocation, id: number, donnees: Partial<RequeteVehicule>): Observable<Vehicule> {
    return this.http.patch<Vehicule>(`${this.base(prefixe)}vehicules/${id}/`, donnees);
  }

  /** 409 si le véhicule a des demandes : proposer alors de le désactiver. */
  supprimerVehicule(prefixe: PrefixeLocation, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(prefixe)}vehicules/${id}/`);
  }

  changerDisponibiliteVehicule(
    prefixe: PrefixeLocation,
    id: number,
    donnees: RequeteDisponibiliteVehicule,
  ): Observable<Vehicule> {
    return this.http.post<Vehicule>(`${this.base(prefixe)}vehicules/${id}/disponibilite/`, donnees);
  }

  // ---- Images des logements et des véhicules (ressource) ----
  // Corps multipart : "article" = id du logement ou du véhicule (même convention que les images de
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
  // Corps multipart : "article" = id du logement ou du véhicule, "image", "titre", "type_vue", "ordre".

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

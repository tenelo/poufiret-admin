import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { ReponsePaginee } from '../../../modeles/pagination.model';
import {
  CONFIG_NIVEAUX_GEO,
  CorpsGeo,
  EndpointGeo,
  ErreursGeo,
  EtapeGeo,
  FiltresGeo,
  LigneGeo,
  NiveauGeo,
  OptionGeo,
  ReponseOptionsGeo,
} from '../../../modeles/geographie.model';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/**
 * Service générique de gestion de la géographie (/administration/geo/<niveau>/) :
 * un seul service pour les 4 niveaux, le niveau étant un paramètre.
 */
@Injectable({ providedIn: 'root' })
export class GeographieService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private url(chemin: string): string {
    return `${this.configuration.apiUrl}/administration/geo/${chemin}`;
  }

  /** GET .../<niveau>/?search=&actif=&<parent>=&page=&page_size= */
  lister(
    niveau: NiveauGeo,
    filtres: FiltresGeo,
    page: number,
    taillePage: number,
  ): Observable<ReponsePaginee<LigneGeo>> {
    const params = this.construireParams(niveau, filtres).set('page', page).set('page_size', taillePage);
    return this.http.get<ReponsePaginee<LigneGeo>>(this.url(`${niveau}/`), { params });
  }

  /** GET .../<niveau>/export/ : CSV avec les mêmes filtres (sans pagination). */
  exporterCsv(niveau: NiveauGeo, filtres: FiltresGeo): Observable<void> {
    return this.http
      .get(this.url(`${niveau}/export/`), {
        responseType: 'blob',
        params: this.construireParams(niveau, filtres),
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate(`geo-${niveau}`, 'csv'))),
        map(() => undefined),
      );
  }

  /**
   * GET .../<endpoint>/options/?<parent>= : liste {id, nom} des éléments actifs
   * (défaut backend), filtrée par le maillon parent le cas échéant.
   */
  options(endpoint: EndpointGeo, parent?: { cle: EtapeGeo; id: number }): Observable<OptionGeo[]> {
    let params = new HttpParams();
    if (parent) {
      params = params.set(parent.cle, parent.id);
    }
    return this.http
      .get<ReponseOptionsGeo>(this.url(`${endpoint}/options/`), { params })
      .pipe(map((reponse) => reponse.resultats ?? []));
  }

  creer(niveau: NiveauGeo, corps: CorpsGeo): Observable<LigneGeo> {
    return this.http.post<LigneGeo>(this.url(`${niveau}/`), corps);
  }

  modifier(niveau: NiveauGeo, id: number, corps: CorpsGeo): Observable<LigneGeo> {
    return this.http.patch<LigneGeo>(this.url(`${niveau}/${id}/`), corps);
  }

  supprimer(niveau: NiveauGeo, id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${niveau}/${id}/`));
  }

  private construireParams(niveau: NiveauGeo, filtres: FiltresGeo): HttpParams {
    let params = new HttpParams();
    const recherche = filtres.search?.trim();
    if (recherche) {
      params = params.set('search', recherche);
    }
    if (filtres.actif) {
      params = params.set('actif', filtres.actif);
    }
    if (filtres.parent) {
      const cascade = CONFIG_NIVEAUX_GEO[niveau].cascade;
      params = params.set(cascade[cascade.length - 1], filtres.parent);
    }
    return params;
  }
}

/**
 * Interprète une erreur d'écriture : 400 {details:{nom:[...]}} → message sous le
 * champ concerné ; 409 {message} → message général ; sinon message générique.
 */
export function analyserErreurGeo(erreur: unknown, cleParent: EtapeGeo): ErreursGeo {
  const resultat: ErreursGeo = { nom: null, parent: null, general: null };

  if (erreur instanceof HttpErrorResponse && erreur.status === 400) {
    const details = erreur.error?.details;
    if (details && typeof details === 'object') {
      const premier = (valeur: unknown): string | null =>
        Array.isArray(valeur) ? String(valeur[0] ?? '') || null : typeof valeur === 'string' ? valeur : null;

      resultat.nom = premier(details['nom']);
      resultat.parent = premier(details[cleParent]);
      if (!resultat.nom && !resultat.parent) {
        const autre = Object.values(details).map(premier).find((m) => !!m);
        resultat.general = autre ?? extraireMessageErreur(erreur);
      }
      return resultat;
    }
  }

  resultat.general = extraireMessageErreur(erreur);
  return resultat;
}

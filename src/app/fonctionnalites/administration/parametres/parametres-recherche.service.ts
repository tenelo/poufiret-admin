import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  CategorieMotsCles,
  FiltresRecherchesSansResultat,
  ReponseCategoriesMotsCles,
  ReponseRecherchesSansResultat,
  RequeteTraiterRecherche,
  ResultatTestRecherche,
} from '../../../modeles/parametres-recherche.model';

/**
 * Service du dictionnaire de recherche (capacité gerer_parametres) : mots-clés par
 * catégorie, recherches sans résultat, test de la recherche.
 */
@Injectable({ providedIn: 'root' })
export class ParametresRechercheService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private url(chemin: string): string {
    return `${this.configuration.apiUrl}/administration/parametres/recherche/${chemin}`;
  }

  /** GET recherche/categories/ */
  listerCategoriesMotsCles(): Observable<CategorieMotsCles[]> {
    return this.http
      .get<ReponseCategoriesMotsCles>(this.url('categories/'))
      .pipe(map((reponse) => reponse.resultats));
  }

  /** PATCH recherche/categories/<id>/ */
  modifierMotsCles(id: number, motsCles: string[]): Observable<CategorieMotsCles> {
    return this.http.patch<CategorieMotsCles>(this.url(`categories/${id}/`), { mots_cles: motsCles });
  }

  /** GET recherche/sans-resultat/?statut=&du=&au= */
  listerSansResultat(filtres: FiltresRecherchesSansResultat): Observable<ReponseRecherchesSansResultat> {
    let params = new HttpParams().set('statut', filtres.statut);
    if (filtres.du) {
      params = params.set('du', filtres.du);
    }
    if (filtres.au) {
      params = params.set('au', filtres.au);
    }
    return this.http.get<ReponseRecherchesSansResultat>(this.url('sans-resultat/'), { params });
  }

  /** POST recherche/sans-resultat/<id>/traiter/ */
  traiter(id: number, corps: RequeteTraiterRecherche): Observable<void> {
    return this.http.post<void>(this.url(`sans-resultat/${id}/traiter/`), corps);
  }

  /** GET recherche/tester/?q= */
  tester(q: string): Observable<ResultatTestRecherche> {
    const params = new HttpParams().set('q', q);
    return this.http.get<ResultatTestRecherche>(this.url('tester/'), { params });
  }
}

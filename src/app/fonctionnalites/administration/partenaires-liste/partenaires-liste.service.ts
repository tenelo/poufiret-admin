import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { Departement } from '../../../modeles/departement.model';
import { FiltresPartenairesListe, ReponsePartenairesListe } from '../../../modeles/partenaire-liste.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service de lecture de la liste plate des partenaires (admin, lecture seule)
 * et de son export CSV. Endpoints protégés côté backend par la capacité
 * `voir_indicateurs`.
 */
@Injectable({ providedIn: 'root' })
export class PartenairesListeService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/partenaires/liste/?q=&type=&statut=&departement= */
  lister(filtres: FiltresPartenairesListe = {}): Observable<ReponsePartenairesListe> {
    return this.http.get<ReponsePartenairesListe>(
      `${this.configuration.apiUrl}/administration/partenaires/liste/`,
      { params: this.construireParams(filtres) },
    );
  }

  /** GET /administration/partenaires/liste/export/ : récupère le CSV et déclenche son téléchargement. */
  exporterCsv(filtres: FiltresPartenairesListe = {}): Observable<void> {
    return this.http
      .get(`${this.configuration.apiUrl}/administration/partenaires/liste/export/`, {
        responseType: 'blob',
        params: this.construireParams(filtres),
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('partenaires', 'csv'))),
        map(() => undefined),
      );
  }

  /** GET /geo/departements/ : peuple le sélecteur de département. */
  listerDepartements(): Observable<Departement[]> {
    return this.http
      .get<ReponseListe<Departement>>(`${this.configuration.apiUrl}/geo/departements/`)
      .pipe(map(normaliserListe));
  }

  private construireParams(filtres: FiltresPartenairesListe): HttpParams {
    let params = new HttpParams();
    const texte = filtres.q?.trim();
    if (texte) {
      params = params.set('q', texte);
    }
    if (filtres.type) {
      params = params.set('type', filtres.type);
    }
    if (filtres.statut) {
      params = params.set('statut', filtres.statut);
    }
    if (filtres.departement) {
      params = params.set('departement', filtres.departement);
    }
    return params;
  }
}

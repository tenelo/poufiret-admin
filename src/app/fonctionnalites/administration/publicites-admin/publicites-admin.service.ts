import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  ActionTransitionPubliciteId,
  FiltresPublicitesAdmin,
  QuotaFormule,
  ReponseQuotasFormules,
  ReponseTransitionPubliciteAdmin,
  StatsPublicitesAdmin,
  TypeExportPublicites,
} from '../../../modeles/publicites-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Service admin des publicités : stats globales, export CSV, transitions de statut. */
@Injectable({ providedIn: 'root' })
export class PublicitesAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /publicites/admin/stats/ : onglet (statut) et filtres appliqués côté API. */
  chargerStats(filtres?: FiltresPublicitesAdmin): Observable<StatsPublicitesAdmin> {
    let params = new HttpParams();
    if (filtres) {
      if (filtres.statut !== 'toutes') params = params.set('statut', filtres.statut);
      if (filtres.recherche.trim()) params = params.set('search', filtres.recherche.trim());
      if (filtres.formule) params = params.set('formule', filtres.formule);
      if (filtres.portee) params = params.set('portee', filtres.portee);
    }
    return this.http.get<StatsPublicitesAdmin>(`${this.configuration.apiUrl}/publicites/admin/stats/`, {
      params,
    });
  }

  /** GET /publicites/admin/formules/ : quotas et occupation de chaque formule. */
  chargerQuotasFormules(): Observable<QuotaFormule[]> {
    return this.http
      .get<ReponseQuotasFormules>(`${this.configuration.apiUrl}/publicites/admin/formules/`)
      .pipe(map((reponse) => reponse.formules ?? []));
  }

  /** GET /publicites/admin/export/?type= : récupère le CSV et déclenche son téléchargement. */
  exporterCsv(type: TypeExportPublicites): Observable<void> {
    const params = new HttpParams().set('type', type);
    return this.http
      .get(`${this.configuration.apiUrl}/publicites/admin/export/`, { responseType: 'blob', params })
      .pipe(
        tap((blob) =>
          declencherTelechargementFichier(blob, nomFichierHorodate(`publicites-${type}`, 'csv')),
        ),
        map(() => undefined),
      );
  }

  /** POST /publicites/<id>/transition/<action>/ */
  appliquerTransition(
    id: string,
    action: ActionTransitionPubliciteId,
  ): Observable<ReponseTransitionPubliciteAdmin> {
    return this.http.post<ReponseTransitionPubliciteAdmin>(
      `${this.configuration.apiUrl}/publicites/${id}/transition/${action}/`,
      {},
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  ActionTransitionPubliciteId,
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

  /** GET /publicites/admin/stats/ */
  chargerStats(): Observable<StatsPublicitesAdmin> {
    return this.http.get<StatsPublicitesAdmin>(`${this.configuration.apiUrl}/publicites/admin/stats/`);
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

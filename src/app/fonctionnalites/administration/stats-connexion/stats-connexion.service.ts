import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { StatsConnexion } from '../../../modeles/stats-connexion.model';
import { DureeSessions } from '../../../modeles/duree-sessions.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Service de lecture des stats de connexion et de l'export CSV détaillé des sessions. */
@Injectable({ providedIn: 'root' })
export class StatsConnexionService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /analytics/admin/stats-connexion/ */
  charger(): Observable<StatsConnexion> {
    return this.http.get<StatsConnexion>(`${this.configuration.apiUrl}/analytics/admin/stats-connexion/`);
  }

  /**
   * GET /analytics/admin/stats-connexion/export/?jours=<N> : détail session
   * par session. `jours` n'est envoyé que s'il est fourni (vide = tout).
   */
  exporterCsv(jours?: number): Observable<void> {
    const params = jours !== undefined ? new HttpParams().set('jours', jours) : undefined;

    return this.http
      .get(`${this.configuration.apiUrl}/analytics/admin/stats-connexion/export/`, {
        responseType: 'blob',
        params,
      })
      .pipe(
        tap((blob) =>
          declencherTelechargementFichier(blob, nomFichierHorodate('stats-connexion', 'csv')),
        ),
        map(() => undefined),
      );
  }

  /** GET /analytics/admin/duree-sessions/?jours=<N> : durées des sessions, globales/par utilisateur/par jour. */
  chargerDurees(jours?: number): Observable<DureeSessions> {
    const params = jours !== undefined ? new HttpParams().set('jours', jours) : undefined;
    return this.http.get<DureeSessions>(
      `${this.configuration.apiUrl}/analytics/admin/duree-sessions/`,
      { params },
    );
  }

  /** GET /analytics/admin/duree-sessions/export/?jours=<N> */
  exporterDurees(jours?: number): Observable<void> {
    const params = jours !== undefined ? new HttpParams().set('jours', jours) : undefined;

    return this.http
      .get(`${this.configuration.apiUrl}/analytics/admin/duree-sessions/export/`, {
        responseType: 'blob',
        params,
      })
      .pipe(
        tap((blob) =>
          declencherTelechargementFichier(blob, nomFichierHorodate('duree-sessions', 'csv')),
        ),
        map(() => undefined),
      );
  }
}

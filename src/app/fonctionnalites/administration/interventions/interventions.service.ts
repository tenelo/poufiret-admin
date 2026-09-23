import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { ReponseInterventionsAdmin, StatutIntervention } from '../../../modeles/intervention-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/**
 * Service de lecture des demandes d'intervention (admin, lecture seule) et de
 * leur export CSV. Endpoints protégés côté backend par la capacité
 * `voir_interventions` (les deux, y compris l'export).
 */
@Injectable({ providedIn: 'root' })
export class InterventionsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/interventions/?statut=&q= */
  lister(statut?: StatutIntervention | '', q?: string): Observable<ReponseInterventionsAdmin> {
    return this.http.get<ReponseInterventionsAdmin>(
      `${this.configuration.apiUrl}/administration/interventions/`,
      { params: this.construireParams(statut, q) },
    );
  }

  /** GET /administration/interventions/export/ : récupère le CSV et déclenche son téléchargement. */
  exporterCsv(statut?: StatutIntervention | '', q?: string): Observable<void> {
    return this.http
      .get(`${this.configuration.apiUrl}/administration/interventions/export/`, {
        responseType: 'blob',
        params: this.construireParams(statut, q),
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('interventions', 'csv'))),
        map(() => undefined),
      );
  }

  private construireParams(statut?: StatutIntervention | '', q?: string): HttpParams {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    const texte = q?.trim();
    if (texte) {
      params = params.set('q', texte);
    }
    return params;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { FiltresConnexionsAdmin, ReponseConnexionsAdmin } from '../../../modeles/connexion-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/**
 * Service de lecture de la trace des connexions admin (lecture seule) et de
 * son export CSV. Endpoints protégés côté backend par la capacité `lire_journal`.
 */
@Injectable({ providedIn: 'root' })
export class ConnexionsAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/connexions-admin/?jours=&q=&utilisateur= */
  lister(filtres: FiltresConnexionsAdmin = {}): Observable<ReponseConnexionsAdmin> {
    return this.http.get<ReponseConnexionsAdmin>(
      `${this.configuration.apiUrl}/administration/connexions-admin/`,
      { params: this.construireParams(filtres) },
    );
  }

  /** GET /administration/connexions-admin/export/ : récupère le CSV et déclenche son téléchargement. */
  exporterCsv(filtres: FiltresConnexionsAdmin = {}): Observable<void> {
    return this.http
      .get(`${this.configuration.apiUrl}/administration/connexions-admin/export/`, {
        responseType: 'blob',
        params: this.construireParams(filtres),
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('connexions-admin', 'csv'))),
        map(() => undefined),
      );
  }

  private construireParams(filtres: FiltresConnexionsAdmin): HttpParams {
    let params = new HttpParams();
    if (filtres.jours !== undefined) {
      params = params.set('jours', filtres.jours);
    }
    const texte = filtres.q?.trim();
    if (texte) {
      params = params.set('q', texte);
    }
    if (filtres.utilisateur !== undefined) {
      params = params.set('utilisateur', filtres.utilisateur);
    }
    return params;
  }
}

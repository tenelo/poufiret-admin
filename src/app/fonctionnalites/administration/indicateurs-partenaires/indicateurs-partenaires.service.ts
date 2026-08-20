import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { IndicateursPartenaires } from '../../../modeles/indicateurs-partenaires.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Service de lecture des indicateurs partenaires et de leur export CSV. */
@Injectable({ providedIn: 'root' })
export class IndicateursPartenairesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/partenaires/ */
  charger(): Observable<IndicateursPartenaires> {
    return this.http.get<IndicateursPartenaires>(
      `${this.configuration.apiUrl}/administration/partenaires/`,
    );
  }

  /**
   * GET /administration/partenaires/export/ : récupère le CSV et déclenche
   * son téléchargement (nom de fichier horodaté). Le jeton JWT est déjà posé
   * par l'intercepteur.
   */
  exporterCsv(): Observable<void> {
    return this.http
      .get(`${this.configuration.apiUrl}/administration/partenaires/export/`, {
        responseType: 'blob',
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('partenaires', 'csv'))),
        map(() => undefined),
      );
  }
}

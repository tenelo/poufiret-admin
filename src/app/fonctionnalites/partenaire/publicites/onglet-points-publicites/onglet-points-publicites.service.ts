import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { StatistiquePublicite } from '../../../../modeles/publicite.model';

/** Service de lecture des statistiques des campagnes du partenaire connecté. */
@Injectable({ providedIn: 'root' })
export class OngletPointsPublicitesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /publicites/mes-stats/ : stats des campagnes du partenaire connecté. */
  chargerStats(): Observable<StatistiquePublicite[]> {
    return this.http
      .get<{ publicites: StatistiquePublicite[] }>(
        `${this.configuration.apiUrl}/publicites/mes-stats/`,
      )
      .pipe(map((reponse) => reponse.publicites));
  }
}

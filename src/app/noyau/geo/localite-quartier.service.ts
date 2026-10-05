import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../config/configuration.service';
import { OptionGeo } from '../../modeles/geographie.model';

interface ReponseOptionsGeoPublic {
  resultats: OptionGeo[];
}

/**
 * Cascade publique (lecture seule, AllowAny) Département → Localité → Quartier,
 * utilisée par les formulaires qui saisissent l'adresse d'un partenaire (Créer un
 * partenaire, Mon profil). Distincte du CRUD admin de la géographie
 * (`GeographieService`, capacité gerer_geographie).
 */
@Injectable({ providedIn: 'root' })
export class LocaliteQuartierService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /geo/localites/?departement=<id> */
  listerLocalites(departementId: number): Observable<OptionGeo[]> {
    return this.http
      .get<ReponseOptionsGeoPublic>(`${this.configuration.apiUrl}/geo/localites/`, {
        params: { departement: departementId },
      })
      .pipe(map((reponse) => reponse.resultats));
  }

  /** GET /geo/quartiers/?localite=<id> */
  listerQuartiers(localiteId: number): Observable<OptionGeo[]> {
    return this.http
      .get<ReponseOptionsGeoPublic>(`${this.configuration.apiUrl}/geo/quartiers/`, {
        params: { localite: localiteId },
      })
      .pipe(map((reponse) => reponse.resultats));
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import {
  FiltreStatutRapprochement,
  LigneRapprochement,
  ReponseRapprochementPartenaires,
  RequeteValiderRapprochement,
} from '../../../../modeles/rapprochement-partenaire.model';

/**
 * Service du rapprochement des anciens textes libres (ville/quartier) des
 * partenaires vers la géographie structurée (capacité gerer_geographie).
 */
@Injectable({ providedIn: 'root' })
export class RapprochementService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private url(chemin = ''): string {
    return `${this.configuration.apiUrl}/administration/geo/rapprochement-partenaires/${chemin}`;
  }

  /** GET .../rapprochement-partenaires/?statut=exact|proposition|aucun|tous */
  lister(statut: FiltreStatutRapprochement): Observable<ReponseRapprochementPartenaires> {
    const params = new HttpParams().set('statut', statut);
    return this.http.get<ReponseRapprochementPartenaires>(this.url(), { params });
  }

  /** POST .../rapprochement-partenaires/<partenaire_id>/ */
  valider(partenaireId: number, corps: RequeteValiderRapprochement): Observable<LigneRapprochement> {
    return this.http.post<LigneRapprochement>(this.url(`${partenaireId}/`), corps);
  }
}

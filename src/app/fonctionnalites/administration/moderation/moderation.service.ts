import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  ActionModeration,
  CompteModeration,
  ReponseModeration,
  RequeteModeration,
  RoleCompte,
} from '../../../modeles/compte-moderation.model';

interface ReponseRechercheComptes {
  resultats: CompteModeration[];
}

/** Service admin (super-admin) de recherche et de modération de comptes. */
@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/comptes/recherche/?q=&role= */
  rechercherComptes(q: string, role?: RoleCompte | ''): Observable<CompteModeration[]> {
    let params = new HttpParams().set('q', q);
    if (role) {
      params = params.set('role', role);
    }
    return this.http
      .get<ReponseRechercheComptes>(`${this.configuration.apiUrl}/administration/comptes/recherche/`, {
        params,
      })
      .pipe(map((reponse) => reponse.resultats ?? []));
  }

  /** POST /administration/moderation/ */
  moderer(cibleId: number, action: ActionModeration, motif?: string): Observable<ReponseModeration> {
    const donnees: RequeteModeration = motif ? { cible_id: cibleId, action, motif } : { cible_id: cibleId, action };
    return this.http.post<ReponseModeration>(`${this.configuration.apiUrl}/administration/moderation/`, donnees);
  }
}

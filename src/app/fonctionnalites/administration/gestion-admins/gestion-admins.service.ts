import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  AdminGere,
  ReponseCreationAdmin,
  RequeteCreerAdmin,
  RequeteModifierCapacites,
} from '../../../modeles/gestion-admins.model';
import { NomCapacite } from '../../../modeles/permissions-admin.model';

interface ReponseListeAdmins {
  resultats: AdminGere[];
}

/** Service admin (super-admin ou capacité `gerer_admins`) de gestion des comptes admin. */
@Injectable({ providedIn: 'root' })
export class GestionAdminsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/admins/ */
  listerAdmins(): Observable<AdminGere[]> {
    return this.http
      .get<ReponseListeAdmins>(`${this.configuration.apiUrl}/administration/admins/`)
      .pipe(map((reponse) => reponse.resultats ?? []));
  }

  /** GET /administration/admins/<id>/ */
  obtenirAdmin(id: number): Observable<AdminGere> {
    return this.http.get<AdminGere>(`${this.configuration.apiUrl}/administration/admins/${id}/`);
  }

  /** POST /administration/admins/creer/ */
  creerAdmin(payload: RequeteCreerAdmin): Observable<ReponseCreationAdmin> {
    return this.http.post<ReponseCreationAdmin>(
      `${this.configuration.apiUrl}/administration/admins/creer/`,
      payload,
    );
  }

  /** PATCH /administration/admins/<id>/ */
  modifierCapacites(id: number, capacites: Partial<Record<NomCapacite, boolean>>): Observable<AdminGere> {
    const donnees: RequeteModifierCapacites = { capacites };
    return this.http.patch<AdminGere>(`${this.configuration.apiUrl}/administration/admins/${id}/`, donnees);
  }

  /** DELETE /administration/admins/<id>/ */
  revoquerAdmin(id: number, motif?: string): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.configuration.apiUrl}/administration/admins/${id}/`, {
      body: motif ? { motif } : undefined,
    });
  }
}

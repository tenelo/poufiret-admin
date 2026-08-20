import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { TableauBordAdmin } from '../../../modeles/tableau-bord-admin.model';

/**
 * Service de lecture du tableau de bord admin (activité comptes/connexions/
 * appareils). Ne consomme volontairement pas les stats de livraison, traitées
 * par une plateforme séparée.
 */
@Injectable({ providedIn: 'root' })
export class TableauDeBordAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/dashboard/ */
  charger(): Observable<TableauBordAdmin> {
    return this.http.get<TableauBordAdmin>(`${this.configuration.apiUrl}/administration/dashboard/`);
  }
}

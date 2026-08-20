import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { EngagementClients } from '../../../modeles/engagement-clients.model';

/** Service de lecture de l'engagement clients (GET /analytics/admin/engagement/). */
@Injectable({ providedIn: 'root' })
export class EngagementClientsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  charger(): Observable<EngagementClients> {
    return this.http.get<EngagementClients>(`${this.configuration.apiUrl}/analytics/admin/engagement/`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { StatsLivraisonDonnees } from '../modeles/stats-livraison.model';

/**
 * Service de statistiques TeneLivr (bureau ville unique / coordonnateur
 * multi-villes) — module livraison isolé, ne dépend que de
 * ConfigurationService (noyau, partagé).
 */
@Injectable({ providedIn: 'root' })
export class StatsLivraisonService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /livraison/stats/bureau/?debut=&fin= */
  chargerStatsBureau(debut?: string, fin?: string): Observable<StatsLivraisonDonnees> {
    return this.http.get<StatsLivraisonDonnees>(`${this.configuration.apiUrl}/livraison/stats/bureau/`, {
      params: this.construireParams(debut, fin),
    });
  }

  /** GET /livraison/stats/coordonnateur/?debut=&fin=&ville= */
  chargerStatsCoordonnateur(debut?: string, fin?: string, villeId?: number): Observable<StatsLivraisonDonnees> {
    let params = this.construireParams(debut, fin);
    if (villeId) {
      params = params.set('ville', villeId);
    }
    return this.http.get<StatsLivraisonDonnees>(`${this.configuration.apiUrl}/livraison/stats/coordonnateur/`, {
      params,
    });
  }

  private construireParams(debut?: string, fin?: string): HttpParams {
    let params = new HttpParams();
    if (debut) {
      params = params.set('debut', debut);
    }
    if (fin) {
      params = params.set('fin', fin);
    }
    return params;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  ActionTransitionPubliciteId,
  FiltresPublicitesAdmin,
  QuotaFormule,
  ReponseQuotasFormules,
  ReponseTransitionPubliciteAdmin,
  StatsPublicitesAdmin,
  TypeExportPublicites,
} from '../../../modeles/publicites-admin.model';
import {
  FiltresStatsPub,
  StatistiquesPubAdmin,
  bornesPeriodeStatsPub,
} from '../../../modeles/statistiques-pub-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Service admin des publicités : stats globales, export CSV, transitions de statut. */
@Injectable({ providedIn: 'root' })
export class PublicitesAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /publicites/admin/stats/ : onglet (statut) et filtres appliqués côté API. */
  chargerStats(filtres?: FiltresPublicitesAdmin): Observable<StatsPublicitesAdmin> {
    let params = new HttpParams();
    if (filtres) {
      if (filtres.statut !== 'toutes') params = params.set('statut', filtres.statut);
      if (filtres.recherche.trim()) params = params.set('search', filtres.recherche.trim());
      if (filtres.formule) params = params.set('formule', filtres.formule);
      if (filtres.portee) params = params.set('portee', filtres.portee);
    }
    return this.http.get<StatsPublicitesAdmin>(`${this.configuration.apiUrl}/publicites/admin/stats/`, {
      params,
    });
  }

  /** GET /publicites/admin/statistiques/ : tableau de bord statistique (défaut backend : 30 jours). */
  chargerStatistiques(filtres: FiltresStatsPub): Observable<StatistiquesPubAdmin> {
    let params = new HttpParams();
    const { du, au } = bornesPeriodeStatsPub(filtres);
    if (du) params = params.set('du', du);
    if (au) params = params.set('au', au);
    if (filtres.formule) params = params.set('formule', filtres.formule);
    if (filtres.partenaire) params = params.set('partenaire', filtres.partenaire.id);
    if (filtres.portee) params = params.set('portee', filtres.portee);
    return this.http.get<StatistiquesPubAdmin>(`${this.configuration.apiUrl}/publicites/admin/statistiques/`, {
      params,
    });
  }

  /** GET /publicites/admin/formules/ : quotas et occupation de chaque formule. */
  chargerQuotasFormules(): Observable<QuotaFormule[]> {
    return this.http
      .get<ReponseQuotasFormules>(`${this.configuration.apiUrl}/publicites/admin/formules/`)
      .pipe(map((reponse) => reponse.formules ?? []));
  }

  /** GET /publicites/admin/export/?type= : récupère le CSV et déclenche son téléchargement. */
  exporterCsv(type: TypeExportPublicites): Observable<void> {
    const params = new HttpParams().set('type', type);
    return this.http
      .get(`${this.configuration.apiUrl}/publicites/admin/export/`, { responseType: 'blob', params })
      .pipe(
        tap((blob) =>
          declencherTelechargementFichier(blob, nomFichierHorodate(`publicites-${type}`, 'csv')),
        ),
        map(() => undefined),
      );
  }

  /** POST /publicites/admin/<id>/stats-visibles/ {visible} : montre ou masque les stats au partenaire. */
  basculerStatsVisibles(id: string, visible: boolean): Observable<unknown> {
    return this.http.post(`${this.configuration.apiUrl}/publicites/admin/${id}/stats-visibles/`, { visible });
  }

  /** POST /publicites/<id>/transition/<action>/ */
  appliquerTransition(
    id: string,
    action: ActionTransitionPubliciteId,
  ): Observable<ReponseTransitionPubliciteAdmin> {
    return this.http.post<ReponseTransitionPubliciteAdmin>(
      `${this.configuration.apiUrl}/publicites/${id}/transition/${action}/`,
      {},
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  ActiviteUsage,
  ContactsPartenairesUsage,
  EntonnoirUsage,
  FiltresStatistiquesUsage,
  RecherchesUsage,
  ResumeUsage,
  TriContactsPartenairesUsage,
} from '../../../modeles/statistiques-usage.model';

/** Service de lecture des statistiques d'usage (/administration/statistiques-usage/, capacité voir_stats). */
@Injectable({ providedIn: 'root' })
export class StatistiquesUsageService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get base(): string {
    return `${this.configuration.apiUrl}/administration/statistiques-usage/`;
  }

  private params(filtres: FiltresStatistiquesUsage): HttpParams {
    let params = new HttpParams().set('du', filtres.du).set('au', filtres.au);
    if (filtres.departement !== '') {
      params = params.set('departement', filtres.departement);
    }
    return params;
  }

  /** GET resume/ : chiffres clés avec comparaison à la période précédente de même longueur. */
  resume(filtres: FiltresStatistiquesUsage): Observable<ResumeUsage> {
    return this.http.get<ResumeUsage>(`${this.base}resume/`, { params: this.params(filtres) });
  }

  /** GET recherches/ : top 50 des termes et top 50 des termes sans résultat. */
  recherches(filtres: FiltresStatistiquesUsage): Observable<RecherchesUsage> {
    return this.http.get<RecherchesUsage>(`${this.base}recherches/`, { params: this.params(filtres) });
  }

  /** GET entonnoir/ : panier → commande → livraison, motifs d'annulation/refus, par catégorie. */
  entonnoir(filtres: FiltresStatistiquesUsage): Observable<EntonnoirUsage> {
    return this.http.get<EntonnoirUsage>(`${this.base}entonnoir/`, { params: this.params(filtres) });
  }

  /** GET activite/ : séries par jour, par heure et par jour de semaine (recherches/événements/commandes). */
  activite(filtres: FiltresStatistiquesUsage): Observable<ActiviteUsage> {
    return this.http.get<ActiviteUsage>(`${this.base}activite/`, { params: this.params(filtres) });
  }

  /** GET contacts-partenaires/ : tableau trié/paginé par partenaire (vues, appels, WhatsApp, commandes…). */
  contactsPartenaires(
    filtres: FiltresStatistiquesUsage,
    tri: TriContactsPartenairesUsage | `-${TriContactsPartenairesUsage}`,
    page: number,
    pageSize: number,
  ): Observable<ContactsPartenairesUsage> {
    const params = this.params(filtres).set('tri', tri).set('page', page).set('page_size', pageSize);
    return this.http.get<ContactsPartenairesUsage>(`${this.base}contacts-partenaires/`, { params });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { AvisAdmin, FiltresAvisAdmin, ReponseAvisAdmin } from '../../../modeles/avis-admin.model';

/** Liste normalisée, quelle que soit la forme de pagination renvoyée par le backend. */
export interface ListeAvisAdmin {
  avis: AvisAdmin[];
  total: number;
}

/**
 * Modération des avis clients (GET/PATCH /avis/admin/..., capacité gerer_avis). Même principe que
 * les autres centres admin filtrés/paginés (interventions, demandes de location) : filtres envoyés
 * tels quels en query params, réponse normalisée côté service (voir normaliser) pour ne pas supposer
 * une forme de pagination précise avant vérification sur une réponse réelle.
 */
@Injectable({ providedIn: 'root' })
export class AvisAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get base(): string {
    return `${this.configuration.apiUrl}/avis/admin/`;
  }

  /** GET /avis/admin/ : liste paginée filtrée. */
  lister(filtres: FiltresAvisAdmin, page: number, pageSize: number): Observable<ListeAvisAdmin> {
    const params = this.paramsFiltres(filtres).set('page', page).set('page_size', pageSize);
    return this.http.get<ReponseAvisAdmin>(this.base, { params }).pipe(map((reponse) => this.normaliser(reponse)));
  }

  /** PATCH /avis/admin/<id>/ {est_visible: false, motif} : masque l'avis, motif obligatoire. */
  masquer(id: number, motif: string): Observable<AvisAdmin> {
    return this.http.patch<AvisAdmin>(`${this.base}${id}/`, { est_visible: false, motif });
  }

  /** PATCH /avis/admin/<id>/ {est_visible: true} : réaffiche l'avis, pas de motif requis. */
  reafficher(id: number): Observable<AvisAdmin> {
    return this.http.patch<AvisAdmin>(`${this.base}${id}/`, { est_visible: true });
  }

  private paramsFiltres(filtres: FiltresAvisAdmin): HttpParams {
    let params = new HttpParams();
    if (filtres.partenaire.trim()) params = params.set('partenaire', filtres.partenaire.trim());
    if (filtres.note) params = params.set('note', filtres.note);
    if (filtres.visible) params = params.set('visible', filtres.visible);
    if (filtres.objetType) params = params.set('objet_type', filtres.objetType);
    if (filtres.recherche.trim()) params = params.set('q', filtres.recherche.trim());
    if (filtres.du) params = params.set('du', filtres.du);
    if (filtres.au) params = params.set('au', filtres.au);
    return params;
  }

  /** Accepte {count,...,results} (DRF classique) ou {total, resultats} (convention déjà vue ailleurs). */
  private normaliser(reponse: ReponseAvisAdmin): ListeAvisAdmin {
    const avis = reponse.results ?? reponse.resultats ?? [];
    const total = reponse.count ?? reponse.total ?? avis.length;
    return { avis, total };
  }
}

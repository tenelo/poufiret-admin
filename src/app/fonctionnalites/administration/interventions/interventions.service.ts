import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { NoteAdmin } from '../../../modeles/commande-admin.model';
import {
  ArtisanCompatible,
  FiltresInterventionsAdmin,
  InterventionAdminDetail,
  MetaInterventions,
  ReponseInterventionsAdmin,
} from '../../../modeles/intervention-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/**
 * Centre des demandes d'intervention (admin). Lecture : capacité voir_interventions OU
 * gerer_interventions. Écriture (transition, assignation, notes) : réservée à gerer_interventions,
 * le backend la refuse sinon.
 */
@Injectable({ providedIn: 'root' })
export class InterventionsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get base(): string {
    return `${this.configuration.apiUrl}/administration/interventions/`;
  }

  /** GET meta/ : statuts, urgences et types (aucun nom de statut n'est supposé côté UI). */
  meta(): Observable<MetaInterventions> {
    return this.http.get<MetaInterventions>(`${this.base}meta/`);
  }

  /** GET / : liste paginée filtrée + compteurs par statut. */
  lister(filtres: FiltresInterventionsAdmin, page: number, pageSize: number): Observable<ReponseInterventionsAdmin> {
    const params = this.paramsFiltres(filtres).set('page', page).set('page_size', pageSize);
    return this.http.get<ReponseInterventionsAdmin>(this.base, { params });
  }

  /** GET /<id>/ */
  detail(id: number): Observable<InterventionAdminDetail> {
    return this.http.get<InterventionAdminDetail>(`${this.base}${id}/`);
  }

  /** POST /<id>/transition/ : renvoie le détail à jour (motif obligatoire selon commentaire_obligatoire). */
  transition(id: number, action: string, commentaire?: string): Observable<InterventionAdminDetail> {
    const corps: { action: string; commentaire?: string } = { action };
    if (commentaire) {
      corps.commentaire = commentaire;
    }
    return this.http.post<InterventionAdminDetail>(`${this.base}${id}/transition/`, corps);
  }

  /** GET /<id>/artisans-compatibles/ : partenaires actifs compatibles, pour la liste déroulante d'assignation. */
  listerArtisansCompatibles(id: number): Observable<ArtisanCompatible[]> {
    return this.http.get<ArtisanCompatible[]>(`${this.base}${id}/artisans-compatibles/`);
  }

  /** POST /<id>/assigner/ {artisan_id} : renvoie le détail à jour. */
  assigner(id: number, artisanId: number): Observable<InterventionAdminDetail> {
    return this.http.post<InterventionAdminDetail>(`${this.base}${id}/assigner/`, { artisan_id: artisanId });
  }

  /** POST /<id>/notes/ : note interne (visible uniquement par l'administration). */
  ajouterNote(id: number, texte: string): Observable<NoteAdmin> {
    return this.http.post<NoteAdmin>(`${this.base}${id}/notes/`, { texte });
  }

  /** GET /export/ (mêmes filtres que la liste) : récupère le CSV et déclenche son téléchargement. */
  exporterCsv(filtres: FiltresInterventionsAdmin): Observable<void> {
    return this.http
      .get(`${this.base}export/`, { responseType: 'blob', params: this.paramsFiltres(filtres) })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('interventions', 'csv'))),
        map(() => undefined),
      );
  }

  private paramsFiltres(filtres: FiltresInterventionsAdmin): HttpParams {
    let params = new HttpParams();
    if (filtres.statut) params = params.set('statut', filtres.statut);
    if (filtres.urgence) params = params.set('urgence', filtres.urgence);
    if (filtres.type) params = params.set('type', filtres.type);
    if (filtres.artisan.trim()) params = params.set('artisan', filtres.artisan.trim());
    if (filtres.recherche.trim()) params = params.set('q', filtres.recherche.trim());
    if (filtres.du) params = params.set('du', filtres.du);
    if (filtres.au) params = params.set('au', filtres.au);
    return params;
  }
}

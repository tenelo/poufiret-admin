import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import { ReponsePaginee } from '../../modeles/pagination.model';
import {
  DemandeLocation,
  DemandeLocationDetail,
  FiltresDemandesAdmin,
  MetaDemandes,
  NoteAdminDemande,
  ReponseDemandesAdmin,
} from '../../modeles/reservation.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../administration/telecharger-fichier';

/** Groupe envoyé à l'API ; null = pas de filtre de groupe ("Toutes"). */
export type GroupeFiltreDemandes = string | null;

/**
 * Service des demandes de location (/reservations/..., capacité gerer_reservations côté admin) :
 * utilisé par le loueur pour ses propres demandes ET par l'admin pour le centre complet — même
 * backend, même service, comme pour LocationService.
 */
@Injectable({ providedIn: 'root' })
export class DemandesLocationService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get base(): string {
    return `${this.configuration.apiUrl}/reservations/`;
  }

  // ---- Loueur ----

  /** GET mon-espace/?statut=&page=&page_size= */
  listerMesDemandes(statut: string, page: number, pageSize: number): Observable<ReponsePaginee<DemandeLocation>> {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<ReponsePaginee<DemandeLocation>>(`${this.base}mon-espace/`, { params });
  }

  /** POST <id>/transition/ (loueur ou admin, selon qui appelle — même endpoint) : {action, commentaire}. */
  transitionLoueur(id: number, action: string, commentaire?: string): Observable<DemandeLocation> {
    const corps: { action: string; commentaire?: string } = { action };
    if (commentaire) {
      corps.commentaire = commentaire;
    }
    return this.http.post<DemandeLocation>(`${this.base}${id}/transition/`, corps);
  }

  // ---- Admin ----

  /** GET admin/meta/ : statuts, groupes et natures (aucun nom de statut n'est supposé côté UI). */
  meta(): Observable<MetaDemandes> {
    return this.http.get<MetaDemandes>(`${this.base}admin/meta/`);
  }

  /** GET admin/demandes/ : liste paginée filtrée + compteurs par groupe. */
  lister(
    filtres: FiltresDemandesAdmin,
    groupe: GroupeFiltreDemandes,
    page: number,
    pageSize: number,
  ): Observable<ReponseDemandesAdmin> {
    const params = this.paramsFiltres(filtres, groupe).set('page', page).set('page_size', pageSize);
    return this.http.get<ReponseDemandesAdmin>(`${this.base}admin/demandes/`, { params });
  }

  /** GET admin/demandes/<id>/ */
  detail(id: number): Observable<DemandeLocationDetail> {
    return this.http.get<DemandeLocationDetail>(`${this.base}admin/demandes/${id}/`);
  }

  /** POST admin/demandes/<id>/transition/ : renvoie le détail à jour (motif obligatoire pour refus/annulation). */
  transition(id: number, action: string, commentaire?: string): Observable<DemandeLocationDetail> {
    const corps: { action: string; commentaire?: string } = { action };
    if (commentaire) {
      corps.commentaire = commentaire;
    }
    return this.http.post<DemandeLocationDetail>(`${this.base}admin/demandes/${id}/transition/`, corps);
  }

  /** POST admin/demandes/<id>/notes/ : note interne. */
  ajouterNote(id: number, texte: string): Observable<NoteAdminDemande> {
    return this.http.post<NoteAdminDemande>(`${this.base}admin/demandes/${id}/notes/`, { texte });
  }

  /** GET admin/demandes/export/ (mêmes filtres que la liste) : récupère le CSV et le télécharge. */
  exporterCsv(filtres: FiltresDemandesAdmin, groupe: GroupeFiltreDemandes): Observable<void> {
    return this.http
      .get(`${this.base}admin/demandes/export/`, {
        responseType: 'blob',
        params: this.paramsFiltres(filtres, groupe),
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('demandes-location', 'csv'))),
        map(() => undefined),
      );
  }

  private paramsFiltres(filtres: FiltresDemandesAdmin, groupe: GroupeFiltreDemandes): HttpParams {
    let params = new HttpParams();
    if (groupe) {
      params = params.set('groupe', groupe);
    }
    if (filtres.statut) {
      params = params.set('statut', filtres.statut);
    }
    if (filtres.nature) {
      params = params.set('nature', filtres.nature);
    }
    if (filtres.partenaire) {
      params = params.set('partenaire', filtres.partenaire.id);
    }
    if (filtres.recherche.trim()) {
      params = params.set('search', filtres.recherche.trim());
    }
    if (filtres.du) {
      params = params.set('du', filtres.du);
    }
    if (filtres.au) {
      params = params.set('au', filtres.au);
    }
    return params;
  }
}

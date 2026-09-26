import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  CommandeAdminDetail,
  FiltresCommandesAdmin,
  LivraisonCommande,
  MetaCommandes,
  NoteAdmin,
  ReponseCommandesAdmin,
  StatsCommandes,
  bornesPeriode,
} from '../../../modeles/commande-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Groupe envoyé à l'API ; 'toutes' = pas de filtre de groupe. */
export type GroupeFiltre = string | null;

/** Service du centre des commandes admin (/orders/admin/, capacité gerer_commandes). */
@Injectable({ providedIn: 'root' })
export class CommandesAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get base(): string {
    return `${this.configuration.apiUrl}/orders/admin/`;
  }

  /** GET meta/ : statuts, groupes et modes de livraison (aucun nom de statut n'est supposé côté UI). */
  meta(): Observable<MetaCommandes> {
    return this.http.get<MetaCommandes>(`${this.base}meta/`);
  }

  /** GET commandes/ : liste paginée filtrée + compteurs par groupe. */
  lister(
    filtres: FiltresCommandesAdmin,
    groupe: GroupeFiltre,
    page: number,
    pageSize: number,
    ordering?: string,
  ): Observable<ReponseCommandesAdmin> {
    let params = this.paramsFiltres(filtres, groupe).set('page', page).set('page_size', pageSize);
    if (ordering) params = params.set('ordering', ordering);
    return this.http.get<ReponseCommandesAdmin>(`${this.base}commandes/`, { params });
  }

  /** GET commandes/<id>/ */
  detail(id: number): Observable<CommandeAdminDetail> {
    return this.http.get<CommandeAdminDetail>(`${this.base}commandes/${id}/`);
  }

  /** POST commandes/<id>/transition/ : renvoie le détail à jour (400/409 {erreur, message}). */
  transition(id: number, action: string, commentaire?: string): Observable<CommandeAdminDetail> {
    const corps: { action: string; commentaire?: string } = { action };
    if (commentaire) corps.commentaire = commentaire;
    return this.http.post<CommandeAdminDetail>(`${this.base}commandes/${id}/transition/`, corps);
  }

  /** POST commandes/<id>/demander-livreur/ : 409 déjà demandé, 400 non éligible. */
  demanderLivreur(id: number, commentaire?: string): Observable<{ livraison: LivraisonCommande }> {
    const corps: { commentaire?: string } = commentaire ? { commentaire } : {};
    return this.http.post<{ livraison: LivraisonCommande }>(
      `${this.base}commandes/${id}/demander-livreur/`,
      corps,
    );
  }

  /** POST commandes/<id>/notes/ : note interne (visible uniquement par l'administration). */
  ajouterNote(id: number, texte: string): Observable<NoteAdmin> {
    return this.http.post<NoteAdmin>(`${this.base}commandes/${id}/notes/`, { texte });
  }

  /** GET stats/ (défaut backend : 30 jours) : filtres période, partenaire, département. */
  stats(filtres: FiltresCommandesAdmin): Observable<StatsCommandes> {
    let params = new HttpParams();
    const { du, au } = bornesPeriode(filtres);
    if (du) params = params.set('du', du);
    if (au) params = params.set('au', au);
    if (filtres.partenaire) params = params.set('partenaire', filtres.partenaire.id);
    if (filtres.departement !== '') params = params.set('departement', filtres.departement);
    return this.http.get<StatsCommandes>(`${this.base}stats/`, { params });
  }

  /** GET commandes/export/ (mêmes filtres que la liste) : récupère le CSV et le télécharge. */
  exporterCsv(filtres: FiltresCommandesAdmin, groupe: GroupeFiltre): Observable<void> {
    return this.http
      .get(`${this.base}commandes/export/`, {
        responseType: 'blob',
        params: this.paramsFiltres(filtres, groupe),
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('commandes', 'csv'))),
        map(() => undefined),
      );
  }

  private paramsFiltres(filtres: FiltresCommandesAdmin, groupe: GroupeFiltre): HttpParams {
    let params = new HttpParams();
    if (groupe) params = params.set('groupe', groupe);
    if (filtres.statut) params = params.set('statut', filtres.statut);
    if (filtres.partenaire) params = params.set('partenaire', filtres.partenaire.id);
    if (filtres.departement !== '') params = params.set('departement', filtres.departement);
    if (filtres.mode) params = params.set('mode_livraison', filtres.mode);
    if (filtres.recherche.trim()) params = params.set('search', filtres.recherche.trim());
    const { du, au } = bornesPeriode(filtres);
    if (du) params = params.set('du', du);
    if (au) params = params.set('au', au);
    return params;
  }
}

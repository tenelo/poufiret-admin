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
  RequeteCreationPubPartenaire,
  RequeteReconductionPubPartenaire,
  StatsPublicitesAdmin,
  TypeExportPublicites,
} from '../../../modeles/publicites-admin.model';
import {
  FiltresStatsPub,
  StatistiquesPubAdmin,
  bornesPeriodeStatsPub,
} from '../../../modeles/statistiques-pub-admin.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Formule telle que lue sur GET /publicites/formules/ (seul le champ utile ici). */
interface DureeFormule {
  id: string;
  duree_jours: number;
}

/** Ajoute à un FormData les champs communs (dates, règlement, motif pour « Offerte »). */
function ajouterReglement(
  formData: FormData,
  donnees: { dateDebut: string; dateFin: string; reglement: string; motif?: string },
): void {
  formData.append('date_debut', donnees.dateDebut);
  formData.append('date_fin', donnees.dateFin);
  formData.append('reglement', donnees.reglement);
  if (donnees.reglement === 'offerte' && donnees.motif?.trim()) {
    formData.append('motif', donnees.motif.trim());
  }
}

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

  /**
   * GET /publicites/formules/ : durée de chaque formule active (jours), par id — pour préremplir
   * la date de fin d'une pub créée ou reconduite par l'admin.
   */
  chargerDureesFormules(): Observable<Record<string, number>> {
    return this.http
      .get<DureeFormule[] | { results: DureeFormule[] }>(`${this.configuration.apiUrl}/publicites/formules/`)
      .pipe(
        map((reponse) => (Array.isArray(reponse) ? reponse : reponse.results ?? [])),
        map((formules) => Object.fromEntries(formules.map((f) => [f.id, Number(f.duree_jours)]))),
      );
  }

  /**
   * POST /publicites/admin/creer-pour-partenaire/ (multipart, capacité gerer_pubs_partenaires) :
   * crée une pub pour un partenaire, réglée « payee » ou « offerte ». Mêmes noms de champs que la
   * création côté partenaire (formule, titre, description, image_couverture, video, portee).
   * Ne jamais poser de Content-Type : HttpClient gère le boundary du FormData.
   */
  creerPubPartenaire(donnees: RequeteCreationPubPartenaire): Observable<unknown> {
    const formData = new FormData();
    formData.append('partenaire', String(donnees.partenaireId));
    formData.append('formule', donnees.formuleId);
    formData.append('titre', donnees.titre);
    if (donnees.description) formData.append('description', donnees.description);
    formData.append('image_couverture', donnees.imageCouverture);
    if (donnees.video) formData.append('video', donnees.video);
    if (donnees.portee) formData.append('portee', donnees.portee);
    ajouterReglement(formData, donnees);
    return this.http.post(`${this.configuration.apiUrl}/publicites/admin/creer-pour-partenaire/`, formData);
  }

  /**
   * POST /publicites/admin/<id>/reconduire/ (multipart, capacité gerer_pubs_partenaires) :
   * reconduit une campagne terminée ; formule (formule_id) et image facultatives, comme la
   * reconduction côté partenaire.
   */
  reconduirePubPartenaire(id: string, donnees: RequeteReconductionPubPartenaire): Observable<unknown> {
    const formData = new FormData();
    if (donnees.formuleId) formData.append('formule_id', donnees.formuleId);
    if (donnees.imageCouverture) formData.append('image_couverture', donnees.imageCouverture);
    ajouterReglement(formData, donnees);
    return this.http.post(`${this.configuration.apiUrl}/publicites/admin/${id}/reconduire/`, formData);
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

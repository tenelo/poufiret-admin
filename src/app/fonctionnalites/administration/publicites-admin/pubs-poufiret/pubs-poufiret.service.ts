import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { declencherTelechargementFichier, nomFichierHorodate } from '../../telecharger-fichier';
import {
  EcranDecouverteAdmin,
  FiltresPubsPoufiretAdmin,
  PubPoufiretAdmin,
  ReglagesPoufiret,
  ReponseEcransDecouverteAdmin,
  ReponsePublierParcours,
  ReponsePubsPoufiretAdmin,
  RequeteEcranDecouverteAdmin,
  RequeteReglagesPoufiret,
  RequetePubPoufiretAdmin,
} from '../../../../modeles/pub-poufiret.model';

/** Commun à la création (tous les champs requis fournis) et à la modification (partielle). */
function construireFormDataPub(donnees: Partial<RequetePubPoufiretAdmin>): FormData {
  const formData = new FormData();
  if (donnees.titre !== undefined) formData.append('titre', donnees.titre);
  if (donnees.texte !== undefined) formData.append('texte', donnees.texte);
  if (donnees.imageCouverture) formData.append('image_couverture', donnees.imageCouverture);
  if (donnees.categorie !== undefined) formData.append('categorie', String(donnees.categorie));
  if (donnees.estActive !== undefined) formData.append('est_active', String(donnees.estActive));
  if (donnees.dateDebut !== undefined) formData.append('date_debut', donnees.dateDebut ?? '');
  if (donnees.dateFin !== undefined) formData.append('date_fin', donnees.dateFin ?? '');
  if (donnees.portee !== undefined) formData.append('portee', donnees.portee);
  if (donnees.region !== undefined) formData.append('region', donnees.region === null ? '' : String(donnees.region));
  if (donnees.departement !== undefined) {
    formData.append('departement', donnees.departement === null ? '' : String(donnees.departement));
  }
  return formData;
}

function construireFormDataEcran(donnees: Partial<RequeteEcranDecouverteAdmin>): FormData {
  const formData = new FormData();
  if (donnees.titre !== undefined) formData.append('titre', donnees.titre);
  if (donnees.texte !== undefined) formData.append('texte', donnees.texte);
  if (donnees.image) formData.append('image', donnees.image);
  if (donnees.boutonLibelle !== undefined) formData.append('bouton_libelle', donnees.boutonLibelle);
  if (donnees.boutonCategorie !== undefined) {
    formData.append('bouton_categorie', donnees.boutonCategorie === null ? '' : String(donnees.boutonCategorie));
  }
  if (donnees.estActif !== undefined) formData.append('est_actif', String(donnees.estActif));
  return formData;
}

/**
 * Service admin des pubs Poufiret (pubs maison du carrousel), du parcours « Découvrir
 * Poufiret » et de leurs réglages (capacité gerer_pubs_poufiret, super-admin toujours).
 */
@Injectable({ providedIn: 'root' })
export class PubsPoufiretService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private url(chemin: string): string {
    return `${this.configuration.apiUrl}/publicites/admin/poufiret/${chemin}`;
  }

  // ---- Pubs maison ----

  chargerPubs(filtres: FiltresPubsPoufiretAdmin): Observable<ReponsePubsPoufiretAdmin> {
    let params = new HttpParams().set('page', String(filtres.page)).set('page_size', String(filtres.pageSize));
    if (filtres.estActive) params = params.set('est_active', filtres.estActive);
    return this.http.get<ReponsePubsPoufiretAdmin>(this.url('pubs/'), { params });
  }

  creerPub(donnees: RequetePubPoufiretAdmin): Observable<PubPoufiretAdmin> {
    return this.http.post<PubPoufiretAdmin>(this.url('pubs/'), construireFormDataPub(donnees));
  }

  modifierPub(id: string, donnees: Partial<RequetePubPoufiretAdmin>): Observable<PubPoufiretAdmin> {
    return this.http.patch<PubPoufiretAdmin>(this.url(`pubs/${id}/`), construireFormDataPub(donnees));
  }

  /** PATCH simple (pas de fichier) : utilisé pour activer/désactiver une pub. */
  basculerActivePub(id: string, estActive: boolean): Observable<PubPoufiretAdmin> {
    return this.http.patch<PubPoufiretAdmin>(this.url(`pubs/${id}/`), { est_active: estActive });
  }

  supprimerPub(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`pubs/${id}/`));
  }

  /** POST ordre/ {ids} : ordre = position dans la liste. */
  reordonnerPubs(ids: string[]): Observable<{ ids: string[] }> {
    return this.http.post<{ ids: string[] }>(this.url('pubs/ordre/'), { ids });
  }

  /** GET ?export=csv : récupère le CSV et déclenche son téléchargement. */
  exporterPubsCsv(): Observable<void> {
    return this.http
      .get(this.url('pubs/'), { params: new HttpParams().set('export', 'csv'), responseType: 'blob' })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('pubs-poufiret', 'csv'))),
        map(() => undefined),
      );
  }

  // ---- Parcours « Découvrir Poufiret » ----

  chargerEcrans(): Observable<EcranDecouverteAdmin[]> {
    return this.http.get<ReponseEcransDecouverteAdmin>(this.url('ecrans/')).pipe(map((r) => r.ecrans));
  }

  creerEcran(donnees: RequeteEcranDecouverteAdmin): Observable<EcranDecouverteAdmin> {
    return this.http.post<EcranDecouverteAdmin>(this.url('ecrans/'), construireFormDataEcran(donnees));
  }

  modifierEcran(id: string, donnees: Partial<RequeteEcranDecouverteAdmin>): Observable<EcranDecouverteAdmin> {
    return this.http.patch<EcranDecouverteAdmin>(this.url(`ecrans/${id}/`), construireFormDataEcran(donnees));
  }

  basculerActifEcran(id: string, estActif: boolean): Observable<EcranDecouverteAdmin> {
    return this.http.patch<EcranDecouverteAdmin>(this.url(`ecrans/${id}/`), { est_actif: estActif });
  }

  supprimerEcran(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`ecrans/${id}/`));
  }

  reordonnerEcrans(ids: string[]): Observable<{ ids: string[] }> {
    return this.http.post<{ ids: string[] }>(this.url('ecrans/ordre/'), { ids });
  }

  publierParcours(): Observable<ReponsePublierParcours> {
    return this.http.post<ReponsePublierParcours>(this.url('parcours/publier/'), {});
  }

  // ---- Réglages ----

  chargerReglages(): Observable<ReglagesPoufiret> {
    return this.http.get<ReglagesPoufiret>(this.url('reglages/'));
  }

  modifierReglages(donnees: RequeteReglagesPoufiret): Observable<ReglagesPoufiret> {
    const corps: Record<string, unknown> = {};
    if (donnees.pubsMaisonActives !== undefined) corps['pubs_maison_actives'] = donnees.pubsMaisonActives;
    if (donnees.frequencePubMaison !== undefined) corps['frequence_pub_maison'] = donnees.frequencePubMaison;
    if (donnees.dureeAffichageSecondes !== undefined) corps['duree_affichage_secondes'] = donnees.dureeAffichageSecondes;
    if (donnees.parcoursActif !== undefined) corps['parcours_actif'] = donnees.parcoursActif;
    return this.http.patch<ReglagesPoufiret>(this.url('reglages/'), corps);
  }
}

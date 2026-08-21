import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { Departement } from '../../../modeles/departement.model';
import {
  GestionnaireCompte,
  LivreurCompte,
  ReponseCreationGestionnaire,
  ReponseCreationLivreurCompte,
  ReponseCreationSuperviseur,
  RequeteCreerGestionnaire,
  RequeteCreerLivreurCompte,
  RequeteCreerSuperviseur,
  SuperviseurCompte,
} from '../modeles/compte-equipe-livraison.model';

// Le contrat ne précise pas d'enveloppe de pagination pour ces listes : on
// reste défensif (tableau brut ou {results: [...]}), comme ailleurs dans l'app.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

// Filtre client défensif pour gestionnaires/livreurs (support serveur de
// ?ville= confirmé pour ces deux endpoints, mais on garde ce filet par
// sécurité). Superviseurs n'en a plus besoin : ?ville= y est désormais
// confirmé côté serveur (voir listerSuperviseurs).
function filtrerParVille<T extends { ville?: number }>(liste: T[], villeId?: number): T[] {
  if (!villeId) {
    return liste;
  }
  return liste.filter((item) => !item.ville || item.ville === villeId);
}

/**
 * Service de gestion des comptes d'équipe TeneLivr (superviseurs,
 * gestionnaires, livreurs) par ville — module livraison isolé, ne dépend que
 * de ConfigurationService (noyau, partagé).
 */
@Injectable({ providedIn: 'root' })
export class ComptesLivraisonService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /geo/departements/ */
  listerDepartements(): Observable<Departement[]> {
    return this.http
      .get<ReponseListe<Departement>>(`${this.configuration.apiUrl}/geo/departements/`)
      .pipe(map(normaliserListe));
  }

  // ---- Superviseurs (coordonnateur only) ----

  listerSuperviseurs(villeId?: number): Observable<SuperviseurCompte[]> {
    let params = new HttpParams();
    if (villeId) {
      params = params.set('ville', villeId);
    }
    // ?ville= est maintenant supporté côté serveur pour cet endpoint (confirmé) :
    // pas de filtre client de secours ici, il masquerait un filtrage serveur
    // correct dès que les objets superviseur n'exposent pas de champ `ville`.
    return this.http
      .get<ReponseListe<SuperviseurCompte>>(`${this.configuration.apiUrl}/livraison/comptes/superviseurs/`, {
        params,
      })
      .pipe(map(normaliserListe));
  }

  creerSuperviseur(payload: RequeteCreerSuperviseur): Observable<ReponseCreationSuperviseur> {
    return this.http.post<ReponseCreationSuperviseur>(
      `${this.configuration.apiUrl}/livraison/comptes/superviseurs/`,
      payload,
    );
  }

  desactiverSuperviseur(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(
      `${this.configuration.apiUrl}/livraison/comptes/superviseurs/${id}/`,
    );
  }

  // ---- Gestionnaires ----

  listerGestionnaires(villeId?: number): Observable<GestionnaireCompte[]> {
    let params = new HttpParams();
    if (villeId) {
      params = params.set('ville', villeId);
    }
    return this.http
      .get<ReponseListe<GestionnaireCompte>>(`${this.configuration.apiUrl}/livraison/comptes/gestionnaires/`, {
        params,
      })
      .pipe(map(normaliserListe), map((liste) => filtrerParVille(liste, villeId)));
  }

  creerGestionnaire(payload: RequeteCreerGestionnaire): Observable<ReponseCreationGestionnaire> {
    return this.http.post<ReponseCreationGestionnaire>(
      `${this.configuration.apiUrl}/livraison/comptes/gestionnaires/`,
      payload,
    );
  }

  desactiverGestionnaire(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(
      `${this.configuration.apiUrl}/livraison/comptes/gestionnaires/${id}/`,
    );
  }

  // ---- Livreurs ----

  listerLivreurs(villeId?: number): Observable<LivreurCompte[]> {
    let params = new HttpParams();
    if (villeId) {
      params = params.set('ville', villeId);
    }
    return this.http
      .get<ReponseListe<LivreurCompte>>(`${this.configuration.apiUrl}/livraison/comptes/livreurs/`, { params })
      .pipe(map(normaliserListe), map((liste) => filtrerParVille(liste, villeId)));
  }

  creerLivreur(payload: RequeteCreerLivreurCompte): Observable<ReponseCreationLivreurCompte> {
    return this.http.post<ReponseCreationLivreurCompte>(
      `${this.configuration.apiUrl}/livraison/comptes/livreurs/`,
      payload,
    );
  }

  desactiverLivreur(id: string): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.configuration.apiUrl}/livraison/comptes/livreurs/${id}/`);
  }
}

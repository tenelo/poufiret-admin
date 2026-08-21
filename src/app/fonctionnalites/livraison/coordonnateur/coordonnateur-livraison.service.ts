import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { CourseLivraison, RequeteAssignerLivreur, StatutCourse } from '../modeles/course-livraison.model';
import { LivreurBureau, StatutLivreur } from '../modeles/livreur-bureau.model';

// Le contrat ne précise pas d'enveloppe de pagination : on reste défensif
// (tableau brut ou {results: [...]}), comme ailleurs dans l'app.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service "poste de dispatching" multi-villes du coordonnateur — pendant de
 * BureauLivraisonService, mêmes formats de données, ?ville= en plus. Module
 * livraison isolé, ne dépend que de ConfigurationService (noyau, partagé).
 */
@Injectable({ providedIn: 'root' })
export class CoordonnateurLivraisonService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private construireParams(statut?: string, villeId?: number): HttpParams {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    if (villeId) {
      params = params.set('ville', villeId);
    }
    return params;
  }

  /** GET /livraison/coordonnateur/courses/?statut=&ville= */
  listerCourses(statut?: StatutCourse | '', villeId?: number): Observable<CourseLivraison[]> {
    return this.http
      .get<ReponseListe<CourseLivraison>>(`${this.configuration.apiUrl}/livraison/coordonnateur/courses/`, {
        params: this.construireParams(statut, villeId),
      })
      .pipe(map(normaliserListe));
  }

  /** GET /livraison/coordonnateur/livreurs/?statut=&ville= */
  listerLivreurs(statut?: StatutLivreur | '', villeId?: number): Observable<LivreurBureau[]> {
    return this.http
      .get<ReponseListe<LivreurBureau>>(`${this.configuration.apiUrl}/livraison/coordonnateur/livreurs/`, {
        params: this.construireParams(statut, villeId),
      })
      .pipe(map(normaliserListe));
  }

  /** POST /livraison/coordonnateur/courses/<id>/assigner/ */
  assignerLivreur(courseId: string, livreurId: string): Observable<CourseLivraison> {
    const donnees: RequeteAssignerLivreur = { livreur_id: livreurId };
    return this.http.post<CourseLivraison>(
      `${this.configuration.apiUrl}/livraison/coordonnateur/courses/${courseId}/assigner/`,
      donnees,
    );
  }
}

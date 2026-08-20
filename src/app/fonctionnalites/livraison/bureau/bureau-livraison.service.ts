import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  CourseLivraison,
  ReponseCreationCourse,
  RequeteAssignerLivreur,
  RequeteCreerCourse,
  StatutCourse,
} from '../modeles/course-livraison.model';
import { LivreurBureau, StatutLivreur } from '../modeles/livreur-bureau.model';

// Le contrat ne précise pas d'enveloppe de pagination pour ces deux listes :
// on reste défensif (tableau brut ou {results: [...]}), comme ailleurs dans l'app.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service "poste de dispatching" du bureau (gestionnaire) — module livraison
 * isolé, ne dépend que de ConfigurationService (noyau, partagé).
 */
@Injectable({ providedIn: 'root' })
export class BureauLivraisonService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /livraison/bureau/courses/?statut= */
  listerCourses(statut?: StatutCourse | ''): Observable<CourseLivraison[]> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http
      .get<ReponseListe<CourseLivraison>>(`${this.configuration.apiUrl}/livraison/bureau/courses/`, { params })
      .pipe(map(normaliserListe));
  }

  /** GET /livraison/bureau/livreurs/?statut= */
  listerLivreurs(statut?: StatutLivreur | ''): Observable<LivreurBureau[]> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http
      .get<ReponseListe<LivreurBureau>>(`${this.configuration.apiUrl}/livraison/bureau/livreurs/`, { params })
      .pipe(map(normaliserListe));
  }

  /** POST /livraison/bureau/courses/<id>/assigner/ */
  assignerLivreur(courseId: string, livreurId: string): Observable<CourseLivraison> {
    const donnees: RequeteAssignerLivreur = { livreur_id: livreurId };
    return this.http.post<CourseLivraison>(
      `${this.configuration.apiUrl}/livraison/bureau/courses/${courseId}/assigner/`,
      donnees,
    );
  }

  /** POST /livraison/bureau/courses/creer/ */
  creerCourse(payload: RequeteCreerCourse): Observable<ReponseCreationCourse> {
    return this.http.post<ReponseCreationCourse>(
      `${this.configuration.apiUrl}/livraison/bureau/courses/creer/`,
      payload,
    );
  }
}

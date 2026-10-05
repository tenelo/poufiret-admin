import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  CategorieOrdonnee,
  ReponseCategoriesOrdonnees,
} from '../../../modeles/parametres-categories.model';

/**
 * Service de l'ordre d'affichage et de la visibilité des catégories dans la
 * grille de l'application (capacité gerer_parametres).
 */
@Injectable({ providedIn: 'root' })
export class ParametresCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private url(chemin = ''): string {
    return `${this.configuration.apiUrl}/administration/parametres/categories/${chemin}`;
  }

  /** GET categories/ */
  lister(): Observable<CategorieOrdonnee[]> {
    return this.http.get<ReponseCategoriesOrdonnees>(this.url()).pipe(map((reponse) => reponse.resultats));
  }

  /** POST categories/ordre/ : ordre complet des enfants directs d'un même parent. */
  definirOrdre(parentId: number | null, ordre: number[]): Observable<void> {
    return this.http.post<void>(this.url('ordre/'), { parent_id: parentId, ordre });
  }

  /** PATCH categories/<id>/ */
  modifierActive(id: number, estActive: boolean): Observable<CategorieOrdonnee> {
    return this.http.patch<CategorieOrdonnee>(this.url(`${id}/`), { est_active: estActive });
  }
}

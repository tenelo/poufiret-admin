import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  CategorieAdmin,
  ReponseCategoriesAdmin,
  ReponseTypesPartenaireCategorie,
  RequeteCategorieAdmin,
  TypePartenaireCategorie,
} from '../../../modeles/categorie-admin.model';

/**
 * Service CRUD des catégories admin (capacité gerer_parametres) : arborescence,
 * création/édition (multipart si image), suppression, archivage, ordre d'affichage.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private url(chemin = ''): string {
    return `${this.configuration.apiUrl}/administration/categories/${chemin}`;
  }

  /** GET ?archivees=0|1 */
  lister(archivees: boolean): Observable<CategorieAdmin[]> {
    const params = new HttpParams().set('archivees', archivees ? '1' : '0');
    return this.http.get<ReponseCategoriesAdmin>(this.url(), { params }).pipe(map((reponse) => reponse.resultats));
  }

  /** GET types-partenaire/ */
  listerTypesPartenaire(): Observable<TypePartenaireCategorie[]> {
    return this.http
      .get<ReponseTypesPartenaireCategorie>(this.url('types-partenaire/'))
      .pipe(map((reponse) => reponse.resultats));
  }

  creer(donnees: RequeteCategorieAdmin): Observable<CategorieAdmin> {
    return this.http.post<CategorieAdmin>(this.url(), this.construireFormData(donnees));
  }

  modifier(id: number, donnees: RequeteCategorieAdmin): Observable<CategorieAdmin> {
    return this.http.patch<CategorieAdmin>(this.url(`${id}/`), this.construireFormData(donnees));
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${id}/`));
  }

  /** POST <id>/archiver/ {archivee} : archive ou désarchive. */
  archiver(id: number, archivee: boolean): Observable<CategorieAdmin> {
    return this.http.post<CategorieAdmin>(this.url(`${id}/archiver/`), { archivee });
  }

  /** POST ordre/ : ordre complet des enfants directs d'un même parent. */
  definirOrdre(parentId: number | null, ordre: number[]): Observable<void> {
    return this.http.post<void>(this.url('ordre/'), { parent_id: parentId, ordre });
  }

  private construireFormData(donnees: RequeteCategorieAdmin): FormData {
    const formData = new FormData();
    if (donnees.nom !== undefined) {
      formData.append('nom', donnees.nom);
    }
    if (donnees.description !== undefined) {
      formData.append('description', donnees.description);
    }
    if (donnees.icone !== undefined) {
      formData.append('icone', donnees.icone);
    }
    if (donnees.image !== undefined) {
      formData.append('image', donnees.image);
    }
    if (donnees.supprimer_image !== undefined) {
      formData.append('supprimer_image', String(donnees.supprimer_image));
    }
    if (donnees.parent_id !== undefined) {
      formData.append('parent_id', donnees.parent_id === null ? '' : String(donnees.parent_id));
    }
    if (donnees.est_active !== undefined) {
      formData.append('est_active', String(donnees.est_active));
    }
    if (donnees.types_partenaire !== undefined) {
      for (const type of donnees.types_partenaire) {
        formData.append('types_partenaire', type);
      }
    }
    if (donnees.mots_cles !== undefined) {
      for (const motCle of donnees.mots_cles) {
        formData.append('mots_cles', motCle);
      }
    }
    return formData;
  }
}

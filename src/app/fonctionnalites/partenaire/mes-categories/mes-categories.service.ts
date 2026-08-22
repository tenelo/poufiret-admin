import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { MaCategorie } from '../../../modeles/ma-categorie.model';
import { CategorieGlobale } from '../../../modeles/categorie-globale.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}
// selon la configuration de la vue côté backend : on gère les deux formats.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service d'accès aux catégories du partenaire connecté : consultation,
 * ajout/retrait d'une catégorie (parmi les catégories globales du catalogue),
 * et remplacement de l'image de couverture propre à chaque catégorie.
 */
@Injectable({ providedIn: 'root' })
export class MesCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /auth/mes-categories/ : catégories du partenaire connecté. */
  listerMesCategories(): Observable<MaCategorie[]> {
    return this.http
      .get<ReponseListe<MaCategorie>>(`${this.configuration.apiUrl}/auth/mes-categories/`)
      .pipe(map(normaliserListe));
  }

  /** GET /catalogue/categories/ : les catégories globales (pour proposer l'ajout). */
  listerCategoriesGlobales(): Observable<CategorieGlobale[]> {
    return this.http
      .get<ReponseListe<CategorieGlobale>>(`${this.configuration.apiUrl}/catalogue/categories/`)
      .pipe(map(normaliserListe));
  }

  /** POST /auth/mes-categories/ : ajoute une catégorie globale au partenaire connecté. */
  ajouterCategorie(categorieId: number): Observable<MaCategorie> {
    return this.http.post<MaCategorie>(`${this.configuration.apiUrl}/auth/mes-categories/`, {
      categorie_id: categorieId,
    });
  }

  /** DELETE /auth/mes-categories/<id>/ : retire une catégorie du partenaire connecté. */
  retirerCategorie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.configuration.apiUrl}/auth/mes-categories/${id}/`);
  }

  /**
   * PATCH /auth/mes-categories/<id>/ (multipart) : remplace l'image de couverture
   * de la catégorie. Ne jamais poser de header Content-Type ici : avec un FormData,
   * HttpClient et le navigateur gèrent le boundary automatiquement.
   */
  changerImageCouverture(id: number, fichier: File): Observable<MaCategorie> {
    const formData = new FormData();
    formData.append('image_couverture', fichier);

    return this.http.patch<MaCategorie>(
      `${this.configuration.apiUrl}/auth/mes-categories/${id}/`,
      formData,
    );
  }
}

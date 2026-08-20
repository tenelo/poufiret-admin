import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { MaCategorie } from '../../../modeles/ma-categorie.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}
// selon la configuration de la vue côté backend : on gère les deux formats.
type ReponseListeCategories = MaCategorie[] | { results: MaCategorie[] };

/**
 * Service d'accès aux catégories du partenaire connecté : consultation et
 * remplacement de l'image de couverture propre à chaque catégorie.
 */
@Injectable({ providedIn: 'root' })
export class MesCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /auth/mes-categories/ : catégories du partenaire connecté. */
  listerMesCategories(): Observable<MaCategorie[]> {
    return this.http
      .get<ReponseListeCategories>(`${this.configuration.apiUrl}/auth/mes-categories/`)
      .pipe(map((reponse) => (Array.isArray(reponse) ? reponse : reponse.results)));
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

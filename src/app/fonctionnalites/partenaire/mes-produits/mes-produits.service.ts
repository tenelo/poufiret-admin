import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { ArticleDetail, ArticleListe, RequeteArticle } from '../../../modeles/article.model';
import { CategorieCatalogue } from '../../../modeles/categorie-catalogue.model';
import { ImageArticle } from '../../../modeles/image-article.model';
import { ReponsePaginee } from '../../../modeles/pagination.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}
// selon la vue : on gère les deux formats pour les listes non paginées côté contrat.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service CRUD des articles (catalogue) du partenaire connecté, de leurs images,
 * et de l'arbre des catégories du catalogue.
 */
@Injectable({ providedIn: 'root' })
export class MesProduitsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /catalogue/articles/?partenaire=<id>&page=<n> : articles du partenaire, paginés. */
  listerMesArticles(partenaireId: number, page: number): Observable<ReponsePaginee<ArticleListe>> {
    const params = new HttpParams().set('partenaire', partenaireId).set('page', page);
    return this.http.get<ReponsePaginee<ArticleListe>>(
      `${this.configuration.apiUrl}/catalogue/articles/`,
      { params },
    );
  }

  /**
   * Récupère la totalité des articles du partenaire en bouclant sur les pages
   * (`next`) — utilisé pour le regroupement par catégorie en onglets, qui a
   * besoin de la liste complète plutôt que d'une page à la fois.
   */
  listerTousLesArticles(partenaireId: number): Observable<ArticleListe[]> {
    return this.listerMesArticles(partenaireId, 1).pipe(
      expand((reponse) => {
        const pageSuivante = reponse.next ? this.extrairePage(reponse.next) : null;
        return pageSuivante ? this.listerMesArticles(partenaireId, pageSuivante) : EMPTY;
      }),
      reduce<ReponsePaginee<ArticleListe>, ArticleListe[]>((tous, reponse) => [...tous, ...reponse.results], []),
    );
  }

  private extrairePage(urlSuivante: string): number | null {
    try {
      const page = new URL(urlSuivante).searchParams.get('page');
      return page ? Number(page) : null;
    } catch {
      return null;
    }
  }

  /** GET /catalogue/articles/<slug>/ : détail complet d'un article. */
  obtenirArticle(slug: string): Observable<ArticleDetail> {
    return this.http.get<ArticleDetail>(`${this.configuration.apiUrl}/catalogue/articles/${slug}/`);
  }

  /** POST /catalogue/articles/ : crée un article (slug et partenaire posés par le serveur). */
  creerArticle(donnees: RequeteArticle): Observable<ArticleDetail> {
    return this.http.post<ArticleDetail>(`${this.configuration.apiUrl}/catalogue/articles/`, donnees);
  }

  /** PATCH /catalogue/articles/<slug>/ : modifie un article existant. */
  modifierArticle(slug: string, donnees: RequeteArticle): Observable<ArticleDetail> {
    return this.http.patch<ArticleDetail>(
      `${this.configuration.apiUrl}/catalogue/articles/${slug}/`,
      donnees,
    );
  }

  /** DELETE /catalogue/articles/<slug>/ : supprime un article. */
  supprimerArticle(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.configuration.apiUrl}/catalogue/articles/${slug}/`);
  }

  /** GET /catalogue/categories/ : arbre des catégories du catalogue. */
  listerCategories(): Observable<CategorieCatalogue[]> {
    return this.http
      .get<ReponseListe<CategorieCatalogue>>(`${this.configuration.apiUrl}/catalogue/categories/`)
      .pipe(map(normaliserListe));
  }

  /** GET /catalogue/images/?article=<id> : images d'un article. */
  listerImages(articleId: number): Observable<ImageArticle[]> {
    const params = new HttpParams().set('article', articleId);
    return this.http
      .get<ReponseListe<ImageArticle>>(`${this.configuration.apiUrl}/catalogue/images/`, { params })
      .pipe(map(normaliserListe));
  }

  /**
   * POST /catalogue/images/ (multipart) : ajoute une image à un article. Ne jamais poser
   * de header Content-Type ici : avec un FormData, HttpClient et le navigateur gèrent le
   * boundary automatiquement.
   */
  ajouterImage(
    articleId: number,
    fichier: File,
    options: { legende?: string; ordre?: number; estPrincipale?: boolean } = {},
  ): Observable<ImageArticle> {
    const formData = new FormData();
    formData.append('article', String(articleId));
    formData.append('image', fichier);
    if (options.legende) formData.append('legende', options.legende);
    if (options.ordre !== undefined) formData.append('ordre', String(options.ordre));
    if (options.estPrincipale !== undefined) {
      formData.append('est_principale', String(options.estPrincipale));
    }

    return this.http.post<ImageArticle>(`${this.configuration.apiUrl}/catalogue/images/`, formData);
  }

  /** DELETE /catalogue/images/<pk>/ : supprime une image. */
  supprimerImage(pk: number): Observable<void> {
    return this.http.delete<void>(`${this.configuration.apiUrl}/catalogue/images/${pk}/`);
  }

  /** PATCH /catalogue/images/<pk>/ : bascule le statut "image principale" sans ré-uploader. */
  definirEstPrincipale(pk: number, estPrincipale: boolean): Observable<ImageArticle> {
    return this.http.patch<ImageArticle>(`${this.configuration.apiUrl}/catalogue/images/${pk}/`, {
      est_principale: estPrincipale,
    });
  }

  /** PATCH /catalogue/images/<pk>/ : met à jour l'ordre d'affichage d'une image (glisser-déposer). */
  definirOrdre(pk: number, ordre: number): Observable<ImageArticle> {
    return this.http.patch<ImageArticle>(`${this.configuration.apiUrl}/catalogue/images/${pk}/`, { ordre });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { Departement } from '../../../modeles/departement.model';
import { CategorieCatalogue } from '../../../modeles/categorie-catalogue.model';
import {
  ReponseCreationPartenaire,
  RequeteCreationPartenaire,
} from '../../../modeles/creation-partenaire.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}.
// (Le contrat confirmé pour ces deux endpoints décrit un tableau brut ; on
// garde ce filet de sécurité par cohérence avec le reste de l'app.)
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/** Service admin de création complète d'un partenaire (compte + profil actif). */
@Injectable({ providedIn: 'root' })
export class CreationPartenaireService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** POST /auth/partenaires/creer/ */
  creer(payload: RequeteCreationPartenaire): Observable<ReponseCreationPartenaire> {
    return this.http.post<ReponseCreationPartenaire>(
      `${this.configuration.apiUrl}/auth/partenaires/creer/`,
      payload,
    );
  }

  /** GET /geo/departements/ */
  listerDepartements(): Observable<Departement[]> {
    return this.http
      .get<ReponseListe<Departement>>(`${this.configuration.apiUrl}/geo/departements/`)
      .pipe(map(normaliserListe));
  }

  /** GET /catalogue/categories/ (arbre) */
  listerCategories(): Observable<CategorieCatalogue[]> {
    return this.http
      .get<ReponseListe<CategorieCatalogue>>(`${this.configuration.apiUrl}/catalogue/categories/`)
      .pipe(map(normaliserListe));
  }
}

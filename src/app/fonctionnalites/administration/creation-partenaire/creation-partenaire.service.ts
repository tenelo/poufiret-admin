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
import {
  ReponseEditionPartenaire,
  RequeteEditionPartenaire,
} from '../../../modeles/edition-partenaire-admin.model';
import {
  CorrespondanceTypeCategorie,
  ReponseCorrespondancesTypes,
} from '../../../modeles/correspondance-type-categorie.model';

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

  /** GET /catalogue/correspondances-types/ : catégorie correspondant à chaque type de partenaire. */
  listerCorrespondancesTypes(): Observable<CorrespondanceTypeCategorie[]> {
    return this.http
      .get<ReponseCorrespondancesTypes>(`${this.configuration.apiUrl}/catalogue/correspondances-types/`)
      .pipe(map((reponse) => reponse.correspondances));
  }

  /** GET /administration/partenaires/<id>/edition/ */
  chargerPourEdition(id: number): Observable<ReponseEditionPartenaire> {
    return this.http.get<ReponseEditionPartenaire>(
      `${this.configuration.apiUrl}/administration/partenaires/${id}/edition/`,
    );
  }

  /** PATCH /administration/partenaires/<id>/edition/ (multipart si logo/photo_couverture). */
  modifier(id: number, donnees: RequeteEditionPartenaire): Observable<ReponseEditionPartenaire> {
    return this.http.patch<ReponseEditionPartenaire>(
      `${this.configuration.apiUrl}/administration/partenaires/${id}/edition/`,
      this.construireFormDataEdition(donnees),
    );
  }

  private construireFormDataEdition(donnees: RequeteEditionPartenaire): FormData {
    const formData = new FormData();
    const ajouterSiDefini = (cle: string, valeur: string | number | boolean | null | undefined) => {
      if (valeur !== undefined) {
        formData.append(cle, valeur === null ? '' : String(valeur));
      }
    };

    ajouterSiDefini('prenom', donnees.prenom);
    ajouterSiDefini('nom', donnees.nom);
    ajouterSiDefini('nom_commerce', donnees.nom_commerce);
    ajouterSiDefini('description', donnees.description);
    ajouterSiDefini('type_partenaire', donnees.type_partenaire);
    ajouterSiDefini('departement', donnees.departement);
    ajouterSiDefini('localite_id', donnees.localite_id);
    ajouterSiDefini('quartier_id', donnees.quartier_id);
    ajouterSiDefini('secteur', donnees.secteur);
    ajouterSiDefini('adresse', donnees.adresse);
    ajouterSiDefini('telephone_pro', donnees.telephone_pro);
    ajouterSiDefini('whatsapp', donnees.whatsapp);
    ajouterSiDefini('email_pro', donnees.email_pro);
    ajouterSiDefini('supprimer_logo', donnees.supprimer_logo);
    ajouterSiDefini('supprimer_couverture', donnees.supprimer_couverture);
    if (donnees.categories !== undefined) {
      for (const id of donnees.categories) {
        formData.append('categories', String(id));
      }
    }
    if (donnees.logo) {
      formData.append('logo', donnees.logo);
    }
    if (donnees.photo_couverture) {
      formData.append('photo_couverture', donnees.photo_couverture);
    }
    return formData;
  }
}

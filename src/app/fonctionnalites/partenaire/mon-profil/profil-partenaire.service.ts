import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  ProfilPartenaire,
  RequeteMiseAJourProfilPartenaire,
} from '../../../modeles/profil-partenaire.model';

/**
 * Service d'accès au profil du partenaire connecté (vitrine affichée aux clients).
 */
@Injectable({ providedIn: 'root' })
export class ProfilPartenaireService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /auth/mon-profil-partenaire/ : profil complet du partenaire connecté. */
  chargerProfil(): Observable<ProfilPartenaire> {
    return this.http.get<ProfilPartenaire>(
      `${this.configuration.apiUrl}/auth/mon-profil-partenaire/`,
    );
  }

  /** PATCH /auth/mon-profil-partenaire/ : met à jour les champs autorisés du profil. */
  modifierProfil(donnees: RequeteMiseAJourProfilPartenaire): Observable<ProfilPartenaire> {
    return this.http.patch<ProfilPartenaire>(
      `${this.configuration.apiUrl}/auth/mon-profil-partenaire/`,
      donnees,
    );
  }

  /**
   * PATCH /auth/mon-profil-partenaire/ (multipart) : envoie le logo et/ou la photo de
   * couverture. Ne jamais poser de header Content-Type ici : avec un FormData, HttpClient
   * et le navigateur gèrent le boundary automatiquement, et le forcer casse l'upload.
   */
  televerserImagesProfil(fichiers: { logo?: File; photoCouverture?: File }): Observable<ProfilPartenaire> {
    const formData = new FormData();
    if (fichiers.logo) formData.append('logo', fichiers.logo);
    if (fichiers.photoCouverture) formData.append('photo_couverture', fichiers.photoCouverture);

    return this.http.patch<ProfilPartenaire>(
      `${this.configuration.apiUrl}/auth/mon-profil-partenaire/`,
      formData,
    );
  }
}

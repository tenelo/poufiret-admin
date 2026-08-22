import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import {
  FormulePublicite,
  MaPublicite,
  ReponseTransitionPublicite,
  RequeteCreationPublicite,
} from '../../../../modeles/publicite.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service de gestion des campagnes publicitaires du partenaire connecté :
 * formules disponibles, liste de ses campagnes, création et soumission.
 */
@Injectable({ providedIn: 'root' })
export class OngletGestionPublicitesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /publicites/formules/ : formules publicitaires actives. */
  listerFormules(): Observable<FormulePublicite[]> {
    return this.http
      .get<ReponseListe<FormulePublicite>>(`${this.configuration.apiUrl}/publicites/formules/`)
      .pipe(map(normaliserListe));
  }

  /** GET /publicites/mes-publicites/ : campagnes du partenaire connecté. */
  listerMesPublicites(): Observable<MaPublicite[]> {
    return this.http
      .get<ReponseListe<MaPublicite>>(`${this.configuration.apiUrl}/publicites/mes-publicites/`)
      .pipe(map(normaliserListe));
  }

  /**
   * POST /publicites/mes-publicites/ (multipart) : crée une campagne en brouillon.
   * Ne jamais poser de header Content-Type ici : avec un FormData, HttpClient et
   * le navigateur gèrent le boundary automatiquement.
   */
  creerPublicite(donnees: RequeteCreationPublicite): Observable<MaPublicite> {
    const formData = new FormData();
    formData.append('formule', String(donnees.formule));
    formData.append('titre', donnees.titre);
    if (donnees.description) formData.append('description', donnees.description);
    formData.append('image_couverture', donnees.imageCouverture);
    if (donnees.video) formData.append('video', donnees.video);
    formData.append('portee', donnees.portee);

    return this.http.post<MaPublicite>(
      `${this.configuration.apiUrl}/publicites/mes-publicites/`,
      formData,
    );
  }

  /** POST /publicites/<id>/transition/soumettre/ : passe la campagne en attente de paiement. */
  soumettrePublicite(id: string): Observable<ReponseTransitionPublicite> {
    return this.http.post<ReponseTransitionPublicite>(
      `${this.configuration.apiUrl}/publicites/${id}/transition/soumettre/`,
      {},
    );
  }

  /**
   * POST /publicites/mes-publicites/<id>/reconduire/ (multipart) : copie une
   * campagne terminée en nouvelle campagne brouillon, formule au choix (par
   * défaut celle de la campagne d'origine si `formuleId` est omis) et image de
   * couverture optionnelle (sinon l'ancienne est reprise par le backend).
   */
  reconduirePublicite(id: string, formuleId?: number, image?: File): Observable<MaPublicite> {
    const formData = new FormData();
    if (formuleId) formData.append('formule_id', String(formuleId));
    if (image) formData.append('image_couverture', image);

    return this.http.post<MaPublicite>(
      `${this.configuration.apiUrl}/publicites/mes-publicites/${id}/reconduire/`,
      formData,
    );
  }

  /**
   * POST /publicites/mes-publicites/<id>/image/ (multipart) : remplace l'image
   * de couverture d'une campagne existante. Si elle était active, le backend
   * la repasse en validation admin.
   */
  changerImagePublicite(id: string, image: File): Observable<MaPublicite> {
    const formData = new FormData();
    formData.append('image_couverture', image);

    return this.http.post<MaPublicite>(
      `${this.configuration.apiUrl}/publicites/mes-publicites/${id}/image/`,
      formData,
    );
  }

  /**
   * POST /publicites/mes-publicites/<id>/masquer/ : retire la campagne des
   * listes du partenaire (masquage — la donnée reste en base côté backend).
   */
  masquerPublicite(id: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${this.configuration.apiUrl}/publicites/mes-publicites/${id}/masquer/`,
      {},
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import { EtatVisibilitePartenaire } from '../../modeles/partenaire-visibilite.model';

/**
 * Actif/inactif (bascule immédiate), suppression douce et restauration d'un partenaire
 * (/administration/partenaires/<id>/visibilite|supprimer|restaurer/), utilisés depuis les listes
 * Partenaires, Restaurants, Commerces et Locations, et depuis le formulaire d'édition d'un
 * partenaire — un seul service, pour éviter de dupliquer ces 3 appels dans chaque écran.
 */
@Injectable({ providedIn: 'root' })
export class PartenaireVisibiliteService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private base(id: number): string {
    return `${this.configuration.apiUrl}/administration/partenaires/${id}`;
  }

  /** GET .../visibilite/ : état actuel (utilisé par le formulaire d'édition, qui ne le reçoit pas autrement). */
  obtenirEtat(id: number): Observable<EtatVisibilitePartenaire> {
    return this.http.get<EtatVisibilitePartenaire>(`${this.base(id)}/visibilite/`);
  }

  /** PATCH .../visibilite/ {est_visible, motif?} — bascule immédiate (capacité masquer_partenaire). */
  changerVisibilite(id: number, estVisible: boolean, motif?: string): Observable<EtatVisibilitePartenaire> {
    const corps: { est_visible: boolean; motif?: string } = { est_visible: estVisible };
    if (motif) {
      corps.motif = motif;
    }
    return this.http.patch<EtatVisibilitePartenaire>(`${this.base(id)}/visibilite/`, corps);
  }

  /** POST .../supprimer/ {motif?} — suppression douce, récupérable (capacité supprimer_soft_partenaire). */
  supprimer(id: number, motif?: string): Observable<EtatVisibilitePartenaire> {
    return this.http.post<EtatVisibilitePartenaire>(`${this.base(id)}/supprimer/`, motif ? { motif } : {});
  }

  /** POST .../restaurer/ {motif?} — annule la suppression douce (capacité restaurer_partenaire). */
  restaurer(id: number, motif?: string): Observable<EtatVisibilitePartenaire> {
    return this.http.post<EtatVisibilitePartenaire>(`${this.base(id)}/restaurer/`, motif ? { motif } : {});
  }
}

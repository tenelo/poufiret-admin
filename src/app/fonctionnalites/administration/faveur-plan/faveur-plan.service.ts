import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { RecherchePartenairesService } from '../recherche-partenaires.service';
import { PartenaireRecherche } from '../../../modeles/credit-pub.model';
import {
  CodePlan,
  ProfilPartenaireFaveur,
  RequeteAccorderPlan,
  RequeteRetirerFaveur,
} from '../../../modeles/profil-partenaire-faveur.model';

/** Service admin d'octroi/retrait de faveur de plan d'abonnement aux partenaires. */
@Injectable({ providedIn: 'root' })
export class FaveurPlanService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);
  private readonly rechercheService = inject(RecherchePartenairesService);

  /** GET /administration/partenaires/recherche/?q= (service partagé). */
  rechercherPartenaires(q: string): Observable<PartenaireRecherche[]> {
    return this.rechercheService.rechercherPartenaires(q);
  }

  /** POST /administration/partenaires/<pk>/faveur/ */
  accorderPlan(partenaireId: number, planCode: CodePlan, motif?: string): Observable<ProfilPartenaireFaveur> {
    const donnees: RequeteAccorderPlan = motif ? { plan_code: planCode, motif } : { plan_code: planCode };
    return this.http.post<ProfilPartenaireFaveur>(
      `${this.configuration.apiUrl}/administration/partenaires/${partenaireId}/faveur/`,
      donnees,
    );
  }

  /** DELETE /administration/partenaires/<pk>/faveur/ (remet au plan basique). */
  retirerFaveur(partenaireId: number, motif?: string): Observable<ProfilPartenaireFaveur> {
    const donnees: RequeteRetirerFaveur | undefined = motif ? { motif } : undefined;
    return this.http.delete<ProfilPartenaireFaveur>(
      `${this.configuration.apiUrl}/administration/partenaires/${partenaireId}/faveur/`,
      donnees ? { body: donnees } : {},
    );
  }
}

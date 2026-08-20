import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  DecisionDemandePartenariat,
  ReponseDecisionDemandePartenariat,
  ReponseDemandesPartenariat,
  RequeteDecisionDemandePartenariat,
} from '../../../modeles/demande-partenariat.model';

/** Service de gestion de la file d'attente des demandes de partenariat. */
@Injectable({ providedIn: 'root' })
export class DemandesPartenariatService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/demandes-partenariat/ : demandes en attente. */
  charger(): Observable<ReponseDemandesPartenariat> {
    return this.http.get<ReponseDemandesPartenariat>(
      `${this.configuration.apiUrl}/administration/demandes-partenariat/`,
    );
  }

  /** POST /administration/demandes-partenariat/ : accepte ou rejette une demande. */
  decider(
    partenaireId: number,
    decision: DecisionDemandePartenariat,
    motif?: string,
  ): Observable<ReponseDecisionDemandePartenariat> {
    const donnees: RequeteDecisionDemandePartenariat = motif
      ? { partenaire_id: partenaireId, decision, motif }
      : { partenaire_id: partenaireId, decision };

    return this.http.post<ReponseDecisionDemandePartenariat>(
      `${this.configuration.apiUrl}/administration/demandes-partenariat/`,
      donnees,
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { RecherchePartenairesService } from '../recherche-partenaires.service';
import {
  CreditPub,
  FormulePub,
  PartenaireRecherche,
  ReponseCreditsPartenaire,
  RequeteAccorderCredit,
} from '../../../modeles/credit-pub.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]}.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/** Service admin de gestion des crédits de formule publicitaire offerts aux partenaires. */
@Injectable({ providedIn: 'root' })
export class CreditsPubService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);
  private readonly rechercheService = inject(RecherchePartenairesService);

  /** GET /administration/partenaires/recherche/?q= (service partagé). */
  rechercherPartenaires(q: string): Observable<PartenaireRecherche[]> {
    return this.rechercheService.rechercherPartenaires(q);
  }

  /** GET /administration/partenaires/<pk>/credits/ */
  listerCredits(partenaireId: number): Observable<ReponseCreditsPartenaire> {
    return this.http.get<ReponseCreditsPartenaire>(
      `${this.configuration.apiUrl}/administration/partenaires/${partenaireId}/credits/`,
    );
  }

  /** POST /administration/partenaires/<pk>/credits/ */
  accorderCredit(partenaireId: number, formuleId: number, motif?: string): Observable<CreditPub> {
    const donnees: RequeteAccorderCredit = motif
      ? { formule_id: formuleId, motif }
      : { formule_id: formuleId };

    return this.http.post<CreditPub>(
      `${this.configuration.apiUrl}/administration/partenaires/${partenaireId}/credits/`,
      donnees,
    );
  }

  /** DELETE /administration/credits/<uuid>/ : 400 si le crédit est déjà consommé. */
  retirerCredit(creditId: string): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(
      `${this.configuration.apiUrl}/administration/credits/${creditId}/`,
    );
  }

  /** GET /publicites/formules/ */
  listerFormules(): Observable<FormulePub[]> {
    return this.http
      .get<ReponseListe<FormulePub>>(`${this.configuration.apiUrl}/publicites/formules/`)
      .pipe(map(normaliserListe));
  }
}

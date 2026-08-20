import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import { PartenaireRecherche } from '../../modeles/credit-pub.model';

// L'endpoint renvoie un objet enveloppé {resultats: [...]} (et non le
// {results: [...]} de la pagination DRF standard) — ne pas les confondre.
interface ReponseRecherchePartenaires {
  resultats: PartenaireRecherche[];
}

/**
 * Recherche de partenaires (GET /administration/partenaires/recherche/?q=),
 * partagée par les écrans admin qui doivent cibler un partenaire précis
 * (Crédits de pub, Faveur de plan, ...) — un seul point d'accès à cet endpoint.
 */
@Injectable({ providedIn: 'root' })
export class RecherchePartenairesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** Liste vide si q < 2 caractères (le backend gère cette règle). */
  rechercherPartenaires(q: string): Observable<PartenaireRecherche[]> {
    const params = new HttpParams().set('q', q);
    return this.http
      .get<ReponseRecherchePartenaires>(
        `${this.configuration.apiUrl}/administration/partenaires/recherche/`,
        { params },
      )
      .pipe(map((reponse) => reponse.resultats ?? []));
  }
}

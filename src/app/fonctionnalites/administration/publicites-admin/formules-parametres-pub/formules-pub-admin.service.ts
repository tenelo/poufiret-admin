import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import {
  FormulePubAdmin,
  ParametresPub,
  ReponsePagineeFormulesPub,
  RequeteFormulePub,
} from '../../../../modeles/formule-pub-admin.model';

/** Le prix peut arriver sous forme de chaîne décimale ("3000.00") : on le normalise en nombre. */
function normaliserFormule(formule: FormulePubAdmin): FormulePubAdmin {
  return { ...formule, prix: Number(formule.prix) };
}

/**
 * Service admin des formules publicitaires et des paramètres généraux
 * (capacité gerer_formules_pub).
 */
@Injectable({ providedIn: 'root' })
export class FormulesPubAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get baseFormules(): string {
    return `${this.configuration.apiUrl}/publicites/admin/formules/gestion/`;
  }

  private get urlParametres(): string {
    return `${this.configuration.apiUrl}/publicites/admin/parametres/`;
  }

  /** GET gestion/?page_size=100 : formules actives ET inactives. */
  lister(): Observable<FormulePubAdmin[]> {
    const params = new HttpParams().set('page_size', 100);
    return this.http
      .get<ReponsePagineeFormulesPub | FormulePubAdmin[]>(this.baseFormules, { params })
      .pipe(map((reponse) => (Array.isArray(reponse) ? reponse : reponse.results).map(normaliserFormule)));
  }

  /** POST gestion/ */
  creer(donnees: RequeteFormulePub): Observable<FormulePubAdmin> {
    return this.http.post<FormulePubAdmin>(this.baseFormules, donnees).pipe(map(normaliserFormule));
  }

  /** PATCH gestion/<uuid>/ (partiel ; la réponse inclut nb_actives). */
  modifier(id: string, donnees: Partial<RequeteFormulePub>): Observable<FormulePubAdmin> {
    return this.http
      .patch<FormulePubAdmin>(`${this.baseFormules}${id}/`, donnees)
      .pipe(map(normaliserFormule));
  }

  /** DELETE gestion/<uuid>/ → 204 (409 si la formule est utilisée par des campagnes). */
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseFormules}${id}/`);
  }

  /** GET /publicites/admin/parametres/ */
  chargerParametres(): Observable<ParametresPub> {
    return this.http.get<ParametresPub>(this.urlParametres);
  }

  /** PATCH /publicites/admin/parametres/ (seuls les champs modifiés). */
  modifierParametres(donnees: Partial<ParametresPub>): Observable<ParametresPub> {
    return this.http.patch<ParametresPub>(this.urlParametres, donnees);
  }
}

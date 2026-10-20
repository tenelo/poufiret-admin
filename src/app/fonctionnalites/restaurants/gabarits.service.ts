import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import { GABARIT_RESTAURANT_PAR_DEFAUT, Gabarit } from '../../modeles/gabarit.model';

type GabaritBrut = Partial<Omit<Gabarit, 'code'>> & { code?: string; gabarit?: string; valeur?: string };

/**
 * Meta des gabarits (GET /restaurants/meta/gabarits/), chargée une seule fois pour la session puis
 * servie depuis le cache. Accepte un objet indexé par code ou une liste portant son code ; complète
 * chaque gabarit avec les valeurs du repli restaurant. En cas d'échec, le cache n'est pas conservé
 * (nouvel essai au prochain appel) et le repli restaurant s'applique.
 */
@Injectable({ providedIn: 'root' })
export class GabaritsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private cache$: Observable<Record<string, Gabarit>> | null = null;

  lister(): Observable<Record<string, Gabarit>> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<Record<string, GabaritBrut> | GabaritBrut[]>(`${this.configuration.apiUrl}/restaurants/meta/gabarits/`)
        .pipe(
          map((reponse) => normaliser(reponse)),
          catchError(() => {
            this.cache$ = null;
            return of({} as Record<string, Gabarit>);
          }),
          shareReplay(1),
        );
    }
    return this.cache$;
  }

  /** Gabarit d'un code, ou le repli restaurant si le code est absent ou inconnu. */
  gabarit(code: string | null | undefined): Observable<Gabarit> {
    return this.lister().pipe(map((gabarits) => (code && gabarits[code]) || GABARIT_RESTAURANT_PAR_DEFAUT));
  }
}

function normaliser(reponse: Record<string, GabaritBrut> | GabaritBrut[]): Record<string, Gabarit> {
  const entrees: [string, GabaritBrut][] = Array.isArray(reponse)
    ? reponse.map((g) => [g.code ?? g.gabarit ?? g.valeur ?? '', g])
    : Object.entries(reponse ?? {});
  const resultat: Record<string, Gabarit> = {};
  for (const [code, brut] of entrees) {
    if (!code) continue;
    resultat[code] = {
      ...GABARIT_RESTAURANT_PAR_DEFAUT,
      ...brut,
      code,
      champs: brut.champs ?? [],
    } as Gabarit;
  }
  return resultat;
}

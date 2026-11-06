import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import { ConfigurationService } from '../../noyau/config/configuration.service';
import {
  GABARITS_CONTRAT,
  GABARIT_RESTAURANT_PAR_DEFAUT,
  Gabarit,
  gabaritCommerceParDefaut,
} from '../../modeles/gabarit.model';

type GabaritBrut = Partial<Omit<Gabarit, 'code'>> & { code?: string; gabarit?: string; valeur?: string };

/**
 * Meta des gabarits (GET /restaurants/meta/gabarits/), chargée une seule fois pour la session puis
 * servie depuis le cache. Accepte un objet indexé par code ou une liste portant son code (éventuellement
 * dans une enveloppe) ; complète chaque gabarit avec le repli propre à son code. En cas d'échec, le cache n'est pas conservé
 * (nouvel essai au prochain appel) et les replis s'appliquent (voir resoudreGabarit).
 */
@Injectable({ providedIn: 'root' })
export class GabaritsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private cache$: Observable<Record<string, Gabarit>> | null = null;

  lister(): Observable<Record<string, Gabarit>> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<unknown>(`${this.configuration.apiUrl}/restaurants/meta/gabarits/`)
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

  /**
   * Gabarit d'un code : celui de la meta, sinon celui du contrat (ex. « elevage » tant que le
   * backend ne le sert pas), sinon un repli commerce sans menus ; restaurant si le code est absent.
   */
  gabarit(code: string | null | undefined): Observable<Gabarit> {
    return this.lister().pipe(map((gabarits) => resoudreGabarit(gabarits, code)));
  }
}

export function resoudreGabarit(gabarits: Record<string, Gabarit>, code: string | null | undefined): Gabarit {
  if (!code || code === 'restaurant') return gabarits['restaurant'] ?? GABARIT_RESTAURANT_PAR_DEFAUT;
  return gabarits[code] ?? GABARITS_CONTRAT[code] ?? gabaritCommerceParDefaut(code);
}

type ReponseGabarits = Record<string, GabaritBrut> | GabaritBrut[];

/** Déballe une éventuelle enveloppe ({gabarits}, {resultats} ou {results}). */
function deballer(reponse: unknown): ReponseGabarits {
  if (reponse && typeof reponse === 'object' && !Array.isArray(reponse)) {
    const enveloppe = reponse as Record<string, unknown>;
    for (const cle of ['gabarits', 'resultats', 'results']) {
      const contenu = enveloppe[cle];
      if (contenu && typeof contenu === 'object') return contenu as ReponseGabarits;
    }
  }
  return (reponse ?? {}) as ReponseGabarits;
}

function normaliser(reponseBrute: unknown): Record<string, Gabarit> {
  const reponse = deballer(reponseBrute);
  const entrees: [string, GabaritBrut][] = Array.isArray(reponse)
    ? reponse.map((g) => [g.code ?? g.gabarit ?? g.valeur ?? '', g])
    : Object.entries(reponse);
  const resultat: Record<string, Gabarit> = {};
  for (const [code, brut] of entrees) {
    if (!code || !brut || typeof brut !== 'object') continue;
    // Champ absent : valeur du repli propre au gabarit (un commerce n'hérite jamais des menus
    // ni des options d'un restaurant).
    const base = code === 'restaurant' ? GABARIT_RESTAURANT_PAR_DEFAUT : (GABARITS_CONTRAT[code] ?? gabaritCommerceParDefaut(code));
    const defini = Object.fromEntries(Object.entries(brut).filter(([, v]) => v !== null && v !== undefined));
    resultat[code] = { ...base, ...defini, code, champs: brut.champs ?? base.champs } as Gabarit;
  }
  return resultat;
}

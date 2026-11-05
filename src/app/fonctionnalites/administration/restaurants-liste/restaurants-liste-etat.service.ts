import { Injectable, WritableSignal, signal } from '@angular/core';

import { FamilleEtablissement } from './familles-etablissements';

export interface EtatListeEtablissements {
  recherche: WritableSignal<string>;
  departementFiltre: WritableSignal<string>;
  gabaritFiltre: WritableSignal<string>;
}

function etatVide(): EtatListeEtablissements {
  return { recherche: signal(''), departementFiltre: signal(''), gabaritFiltre: signal('') };
}

/**
 * Conserve la recherche et les filtres (département, gabarit) de chaque liste admin
 * (« Restaurants », « Commerces ») pour la durée de la session (pas localStorage) : en revenant
 * depuis l'espace établissement, la liste réapparaît telle qu'elle avait été laissée, sans rien
 * re-saisir. Un état par liste : une recherche dans l'une ne filtre pas l'autre.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantsListeEtatService {
  private readonly etats: Record<FamilleEtablissement, EtatListeEtablissements> = {
    restaurants: etatVide(),
    commerces: etatVide(),
  };

  pour(famille: FamilleEtablissement): EtatListeEtablissements {
    return this.etats[famille];
  }
}

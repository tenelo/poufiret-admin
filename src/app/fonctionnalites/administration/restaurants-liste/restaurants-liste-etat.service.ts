import { Injectable, signal } from '@angular/core';

/**
 * Conserve la recherche et les filtres (département, gabarit) de la liste admin des établissements pour la durée
 * de la session (pas localStorage) : en revenant depuis l'espace établissement via « ← Établissements »,
 * la liste réapparaît telle qu'elle avait été laissée, sans rien re-saisir.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantsListeEtatService {
  readonly recherche = signal('');
  readonly departementFiltre = signal('');
  readonly gabaritFiltre = signal('');
}

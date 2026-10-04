import { Injectable, signal } from '@angular/core';

/**
 * Conserve la recherche et le filtre département de la liste admin des restaurants pour la durée
 * de la session (pas localStorage) : en revenant depuis l'espace restaurant via « ← Restaurants »,
 * la liste réapparaît telle qu'elle avait été laissée, sans rien re-saisir.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantsListeEtatService {
  readonly recherche = signal('');
  readonly departementFiltre = signal('');
}

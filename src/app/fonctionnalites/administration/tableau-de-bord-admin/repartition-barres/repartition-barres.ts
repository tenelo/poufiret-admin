import { Component, computed, input } from '@angular/core';

import { PALETTE_GRAPHIQUES, formaterNombre } from '../palette-graphiques';

export interface EntreeRepartition {
  libelle: string;
  valeur: number;
}

/**
 * Carte de répartition sobre : barre empilée proportionnelle + légende avec valeur et pourcentage.
 * Remplace les graphiques en anneau du tableau de bord : lisible même quand tout est à zéro
 * (un anneau sans données n'affiche rien).
 */
@Component({
  selector: 'app-repartition-barres',
  imports: [],
  templateUrl: './repartition-barres.html',
  styleUrl: './repartition-barres.scss',
})
export class RepartitionBarres {
  readonly titre = input.required<string>();
  readonly entrees = input.required<EntreeRepartition[]>();
  /** Message affiché quand le total est nul. */
  readonly messageVide = input('Aucune donnée pour le moment.');

  readonly formaterNombre = formaterNombre;

  readonly total = computed(() => this.entrees().reduce((somme, e) => somme + e.valeur, 0));

  couleur(index: number): string {
    return PALETTE_GRAPHIQUES[index % PALETTE_GRAPHIQUES.length];
  }

  pourcentage(valeur: number): number {
    return this.total() === 0 ? 0 : Math.round((valeur / this.total()) * 100);
  }
}

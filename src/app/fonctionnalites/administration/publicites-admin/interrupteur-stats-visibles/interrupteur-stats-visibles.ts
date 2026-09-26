import { Component, input, output } from '@angular/core';

/**
 * Interrupteur « Stats visibles par le partenaire » d'une campagne. Ne fait aucun appel : émet
 * la valeur souhaitée, le parent demande confirmation puis appelle l'API.
 */
@Component({
  selector: 'app-interrupteur-stats-visibles',
  imports: [],
  templateUrl: './interrupteur-stats-visibles.html',
  styleUrl: './interrupteur-stats-visibles.scss',
})
export class InterrupteurStatsVisibles {
  readonly visible = input.required<boolean>();
  readonly enCours = input(false);

  readonly basculer = output<boolean>();
}

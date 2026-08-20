import { Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * Encapsule chart.js dans un composant réutilisable : type/données/options en
 * entrée, un seul <canvas>, recrée le graphique à chaque changement d'entrée
 * et le détruit proprement à la destruction du composant.
 */
@Component({
  selector: 'app-graphique',
  imports: [],
  templateUrl: './graphique.html',
  styleUrl: './graphique.scss',
})
export class Graphique implements OnDestroy {
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartConfiguration['data']>();
  readonly options = input<ChartConfiguration['options']>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private instance: Chart | null = null;

  constructor() {
    effect(() => {
      const type = this.type();
      const data = this.data();
      const options = this.options();

      this.instance?.destroy();
      this.instance = new Chart(this.canvas().nativeElement, {
        type,
        data,
        options: { responsive: true, maintainAspectRatio: false, ...options },
      });
    });
  }

  ngOnDestroy(): void {
    this.instance?.destroy();
  }
}

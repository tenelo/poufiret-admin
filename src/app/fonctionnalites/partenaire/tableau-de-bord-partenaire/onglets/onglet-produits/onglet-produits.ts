import { Component, computed, input, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../../partage/graphique/graphique';
import { LigneProduitStats, VueProduitsPartenaire } from '../../../../../modeles/tableau-de-bord-partenaire.model';
import { couleursGraphique } from '../../palette-graphiques';

type ColonneTri = 'nom' | 'vuesTotal' | 'vuesJour' | 'vuesSemaine' | 'vuesMois' | 'likes' | 'prix';

/** Onglet "Produits" : table triable des vues par article + 2 graphiques. */
@Component({
  selector: 'app-onglet-produits',
  imports: [Graphique],
  templateUrl: './onglet-produits.html',
  styleUrl: './onglet-produits.scss',
})
export class OngletProduits {
  readonly vue = input.required<VueProduitsPartenaire>();

  readonly colonneTri = signal<ColonneTri>('vuesTotal');
  readonly directionTri = signal<'asc' | 'desc'>('desc');

  readonly lignesTriees = computed<LigneProduitStats[]>(() => {
    const colonne = this.colonneTri();
    const sens = this.directionTri() === 'asc' ? 1 : -1;
    return [...this.vue().lignes].sort((a, b) => {
      if (colonne === 'nom') {
        return sens * a.nom.localeCompare(b.nom);
      }
      if (colonne === 'prix') {
        return sens * (Number(a.prix) - Number(b.prix));
      }
      return sens * (a[colonne] - b[colonne]);
    });
  });

  readonly donneesTop10 = computed<ChartConfiguration['data']>(() => {
    const points = this.vue().top10ParVues;
    return {
      labels: points.map((p) => p.libelle),
      datasets: [
        {
          label: 'Vues',
          data: points.map((p) => p.valeur),
          backgroundColor: '#1B5E20',
        },
      ],
    };
  });

  readonly optionsTop10: ChartConfiguration['options'] = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  readonly donneesCategories = computed<ChartConfiguration['data']>(() => {
    const points = this.vue().repartitionParCategorie;
    return {
      labels: points.map((p) => p.libelle),
      datasets: [
        {
          data: points.map((p) => p.valeur),
          backgroundColor: couleursGraphique(points.length),
        },
      ],
    };
  });

  readonly optionsCategories: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  trier(colonne: ColonneTri): void {
    if (this.colonneTri() === colonne) {
      this.directionTri.set(this.directionTri() === 'asc' ? 'desc' : 'asc');
    } else {
      this.colonneTri.set(colonne);
      this.directionTri.set('desc');
    }
  }
}

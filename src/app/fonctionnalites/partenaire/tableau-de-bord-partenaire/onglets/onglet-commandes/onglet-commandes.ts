import { Component, computed, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../../partage/graphique/graphique';
import { VueCommandesPartenaire } from '../../../../../modeles/tableau-de-bord-partenaire.model';
import {
  COULEUR_PRINCIPALE,
  COULEUR_PRINCIPALE_TRANSPARENTE,
  couleursGraphique,
} from '../../palette-graphiques';
import { formaterFcfa } from '../../formatage';

/** Onglet "Commandes" : répartition par statut, CA par mois, KPIs. */
@Component({
  selector: 'app-onglet-commandes',
  imports: [Graphique],
  templateUrl: './onglet-commandes.html',
  styleUrl: './onglet-commandes.scss',
})
export class OngletCommandes {
  readonly vue = input.required<VueCommandesPartenaire>();

  readonly formaterFcfa = formaterFcfa;

  readonly donneesStatuts = computed<ChartConfiguration['data']>(() => {
    const points = this.vue().repartitionParStatut;
    return {
      labels: points.map((p) => p.libelle),
      datasets: [{ data: points.map((p) => p.valeur), backgroundColor: couleursGraphique(points.length) }],
    };
  });

  readonly optionsStatuts: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  readonly donneesCa = computed<ChartConfiguration['data']>(() => {
    const points = this.vue().caParMois;
    return {
      labels: points.map((p) => p.libelle),
      datasets: [
        {
          label: 'CA (FCFA)',
          data: points.map((p) => p.valeur),
          borderColor: COULEUR_PRINCIPALE,
          backgroundColor: COULEUR_PRINCIPALE_TRANSPARENTE,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  readonly optionsCa: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };
}

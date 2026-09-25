import { Component, computed, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../partage/graphique/graphique';
import { COULEUR_PRINCIPALE, formaterNombre } from '../../tableau-de-bord-admin/palette-graphiques';
import { TableauBordAdmin } from '../../../../modeles/tableau-bord-admin.model';

/**
 * Statistiques de comptes clients (onglet "Vue d'ensemble") : nombre de comptes, taux de clients
 * actifs et activité des clients. Aucun appel réseau : les données viennent du parent
 * (GET /administration/dashboard/ et engagement).
 */
@Component({
  selector: 'app-apercu-clients',
  imports: [Graphique],
  templateUrl: './apercu-clients.html',
  styleUrl: './apercu-clients.scss',
})
export class ApercuClients {
  readonly dashboard = input<TableauBordAdmin | null>(null);
  readonly erreurDashboard = input<string | null>(null);
  /** Clients actifs (calcul backend, engagement) : rapporté au nombre de comptes clients. */
  readonly nbClientsActifs = input(0);

  readonly formaterNombre = formaterNombre;

  readonly optionsBarres: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  readonly nbClients = computed(() => this.dashboard()?.comptes.par_role.client ?? 0);
  readonly enLigne = computed(() => this.dashboard()?.en_ligne.par_role.client ?? 0);
  readonly connectes7j = computed(() => this.dashboard()?.connexions_distinctes.sept_jours.par_role.client ?? 0);

  readonly tauxClientsActifs = computed(() =>
    this.nbClients() === 0 ? 0 : Math.round((this.nbClientsActifs() / this.nbClients()) * 100),
  );

  /** Connexions des clients : en ligne maintenant, puis connexions distinctes par période. */
  readonly donneesActivite = computed<ChartConfiguration['data']>(() => {
    const d = this.dashboard();
    return {
      labels: ['En ligne maintenant', "Connectés aujourd'hui", 'Connectés sur 7 j', 'Connectés sur 30 j'],
      datasets: [
        {
          label: 'Clients',
          data: [
            d?.en_ligne.par_role.client ?? 0,
            d?.connexions_distinctes.aujourdhui.par_role.client ?? 0,
            d?.connexions_distinctes.sept_jours.par_role.client ?? 0,
            d?.connexions_distinctes.trente_jours.par_role.client ?? 0,
          ],
          backgroundColor: COULEUR_PRINCIPALE,
        },
      ],
    };
  });
}

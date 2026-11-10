import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../partage/graphique/graphique';
import { StatistiquesUsageService } from '../statistiques-usage.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { PALETTE_GRAPHIQUES } from '../../tableau-de-bord-admin/palette-graphiques';
import { ActiviteUsage, FiltresStatistiquesUsage } from '../../../../modeles/statistiques-usage.model';

const SOURCES: { cle: 'recherches' | 'evenements' | 'commandes'; libelle: string }[] = [
  { cle: 'recherches', libelle: 'Recherches' },
  { cle: 'evenements', libelle: 'Événements' },
  { cle: 'commandes', libelle: 'Commandes' },
];

/** Activité (GET activite/) : courbe par jour, barres par heure et par jour de la semaine. */
@Component({
  selector: 'app-activite-usage',
  imports: [Graphique],
  templateUrl: './activite-usage.html',
  styleUrl: './activite-usage.scss',
})
export class ActiviteUsageSection {
  private readonly service = inject(StatistiquesUsageService);

  readonly filtres = input.required<FiltresStatistiquesUsage>();

  readonly donnees = signal<ActiviteUsage | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly libelleHeuresPointe = computed(() => {
    const heures = this.donnees()?.heures_de_pointe ?? [];
    return heures.length ? heures.map((h) => `${h} h`).join(', ') : '—';
  });

  readonly optionsLegendeBas: ChartConfiguration['options'] = { plugins: { legend: { position: 'bottom' } } };
  readonly optionsBarresEmpilees: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
  };

  readonly donneesParJour = computed<ChartConfiguration['data']>(() => {
    const jours = this.donnees()?.par_jour ?? [];
    return {
      labels: jours.map((j) => this.formaterJour(j.date)),
      datasets: SOURCES.map((s, i) => ({
        type: 'line' as const,
        label: s.libelle,
        data: jours.map((j) => j[s.cle]),
        borderColor: PALETTE_GRAPHIQUES[i],
        backgroundColor: PALETTE_GRAPHIQUES[i],
        tension: 0.3,
      })),
    };
  });

  readonly donneesParHeure = computed<ChartConfiguration['data']>(() => {
    const heures = this.donnees()?.par_heure ?? [];
    return {
      labels: heures.map((h) => `${h.heure} h`),
      datasets: SOURCES.map((s, i) => ({
        label: s.libelle,
        data: heures.map((h) => h[s.cle]),
        backgroundColor: PALETTE_GRAPHIQUES[i],
      })),
    };
  });

  readonly donneesParJourSemaine = computed<ChartConfiguration['data']>(() => {
    const jours = this.donnees()?.par_jour_semaine ?? [];
    return {
      labels: jours.map((j) => j.libelle),
      datasets: SOURCES.map((s, i) => ({
        label: s.libelle,
        data: jours.map((j) => j[s.cle]),
        backgroundColor: PALETTE_GRAPHIQUES[i],
      })),
    };
  });

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      untracked(() => this.charger(filtres));
    });
  }

  private charger(filtres: FiltresStatistiquesUsage): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.activite(filtres).subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  private formaterJour(iso: string): string {
    const [, mois, jour] = iso.split('-');
    return mois && jour ? `${jour}/${mois}` : iso;
  }
}

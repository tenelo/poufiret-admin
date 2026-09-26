import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';

import { PublicitesAdminService } from '../publicites-admin.service';
import { Graphique } from '../../../../partage/graphique/graphique';
import { optionsCliquables } from '../../../../partage/graphique/options-cliquables';
import { PartenaireChoisi, SelecteurPartenaire } from '../../../../partage/selecteur-partenaire/selecteur-partenaire';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  PALETTE_GRAPHIQUES,
  couleursGraphique,
  formaterNombre,
} from '../../tableau-de-bord-admin/palette-graphiques';
import { OPTIONS_PORTEE } from '../../../../modeles/publicite.model';
import { ONGLETS_STATUT_PUBLICITE_ADMIN, QuotaFormule } from '../../../../modeles/publicites-admin.model';
import {
  FILTRES_STATS_PUB_DEFAUT,
  FiltresStatsPub,
  PeriodeStatsPub,
  StatistiquesPubAdmin,
  TopCampagneStats,
} from '../../../../modeles/statistiques-pub-admin.model';

/**
 * Onglet « Statistiques » de la page Publicités admin : KPI, graphiques Chart.js et top 10 des
 * campagnes (GET /publicites/admin/statistiques/, défaut backend 30 jours). Un clic sur un
 * partenaire ou une formule d'un graphique applique le filtre correspondant ; un clic sur une
 * campagne du tableau ouvre l'onglet Campagnes sur cette campagne.
 */
@Component({
  selector: 'app-statistiques-pub',
  imports: [Graphique, SelecteurPartenaire],
  templateUrl: './statistiques-pub.html',
  styleUrl: './statistiques-pub.scss',
})
export class StatistiquesPub implements OnInit {
  private readonly service = inject(PublicitesAdminService);
  private readonly router = inject(Router);

  readonly optionsPortee = OPTIONS_PORTEE;
  readonly formaterNombre = formaterNombre;

  readonly filtres = signal<FiltresStatsPub>(FILTRES_STATS_PUB_DEFAUT);
  readonly formules = signal<QuotaFormule[]>([]);

  readonly stats = signal<StatistiquesPubAdmin | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      untracked(() => this.charger(filtres));
    });
  }

  ngOnInit(): void {
    // Options du filtre formule (GET /publicites/admin/formules/) ; sans elles, le filtre reste vide.
    this.service.chargerQuotasFormules().subscribe({
      next: (formules) => this.formules.set(formules),
      error: () => undefined,
    });
  }

  charger(filtres: FiltresStatsPub = this.filtres()): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.chargerStatistiques(filtres).subscribe({
      next: (stats) => {
        this.chargementEnCours.set(false);
        this.stats.set(stats);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Filtres ----

  private maj(partiel: Partial<FiltresStatsPub>): void {
    this.filtres.update((f) => ({ ...f, ...partiel }));
  }

  changerPeriode(valeur: string): void {
    this.maj({ periode: valeur as PeriodeStatsPub });
  }

  changerDu(valeur: string): void {
    this.maj({ du: valeur });
  }

  changerAu(valeur: string): void {
    this.maj({ au: valeur });
  }

  changerFormule(valeur: string): void {
    this.maj({ formule: valeur });
  }

  changerPartenaire(partenaire: PartenaireChoisi | null): void {
    this.maj({ partenaire });
  }

  changerPortee(valeur: string): void {
    this.maj({ portee: valeur as FiltresStatsPub['portee'] });
  }

  // ---- Données dérivées ----

  readonly topPartenaires = computed(() =>
    [...(this.stats()?.par_partenaire ?? [])].sort((a, b) => b.impressions - a.impressions).slice(0, 10),
  );

  readonly aDesHeures = computed(() => (this.stats()?.par_heure ?? []).some((h) => h.impressions > 0));

  // ---- Options ----

  private readonly legendeBas = { legend: { position: 'bottom' as const } };

  readonly optionsJour: ChartConfiguration['options'] = {
    interaction: { mode: 'index', intersect: false },
    plugins: this.legendeBas,
    scales: {
      y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Impressions' } },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Clics' },
      },
    },
  };

  readonly optionsDonut: ChartConfiguration['options'] = { plugins: this.legendeBas };

  readonly optionsBarres: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  /** Impressions (axe gauche) et revenus (axe droit) par formule ; taux de clic en info-bulle. */
  readonly optionsFormules = optionsCliquables(
    (i) => {
      const ligne = this.stats()?.par_formule[i];
      if (ligne) this.maj({ formule: ligne.id });
    },
    {
      plugins: {
        ...this.legendeBas,
        tooltip: {
          callbacks: {
            afterLabel: (contexte) => {
              const ligne = this.stats()?.par_formule[contexte.dataIndex];
              return contexte.datasetIndex === 0 && ligne ? `Taux de clic : ${ligne.taux_clic} %` : '';
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, position: 'left', ticks: { precision: 0 }, title: { display: true, text: 'Impressions' } },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Revenus (FCFA)' },
        },
      },
    },
  );

  readonly optionsPartenaires = optionsCliquables(
    (i) => {
      const ligne = this.topPartenaires()[i];
      if (ligne) this.maj({ partenaire: { id: ligne.id, nom: ligne.nom } });
    },
    {
      indexAxis: 'y',
      plugins: this.legendeBas,
      scales: {
        x: { beginAtZero: true, position: 'bottom', ticks: { precision: 0 }, title: { display: true, text: 'Impressions' } },
        x1: {
          beginAtZero: true,
          position: 'top',
          grid: { drawOnChartArea: false },
          ticks: { precision: 0 },
          title: { display: true, text: 'Clics' },
        },
      },
    },
  );

  readonly optionsPortees: ChartConfiguration['options'] = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (contexte) => {
            const ligne = this.stats()?.par_portee[contexte.dataIndex];
            return ligne ? `${ligne.nb_campagnes} campagne(s)` : '';
          },
        },
      },
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  // ---- Jeux de données ----

  readonly donneesJour = computed<ChartConfiguration['data']>(() => {
    const jours = this.stats()?.par_jour ?? [];
    return {
      labels: jours.map((j) => this.formaterJour(j.date)),
      datasets: [
        {
          type: 'line',
          label: 'Impressions',
          data: jours.map((j) => j.impressions),
          borderColor: PALETTE_GRAPHIQUES[0],
          backgroundColor: PALETTE_GRAPHIQUES[0],
          yAxisID: 'y',
          tension: 0.3,
        },
        {
          type: 'line',
          label: 'Clics',
          data: jours.map((j) => j.clics),
          borderColor: PALETTE_GRAPHIQUES[3],
          backgroundColor: PALETTE_GRAPHIQUES[3],
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    };
  });

  readonly donneesTypes = computed<ChartConfiguration['data']>(() => {
    const lignes = this.stats()?.par_type_affichage ?? [];
    return {
      labels: lignes.map((t) => t.libelle),
      datasets: [{ data: lignes.map((t) => t.impressions), backgroundColor: couleursGraphique(lignes.length) }],
    };
  });

  readonly donneesFormules = computed<ChartConfiguration['data']>(() => {
    const lignes = this.stats()?.par_formule ?? [];
    return {
      labels: lignes.map((f) => f.nom),
      datasets: [
        { label: 'Impressions', data: lignes.map((f) => f.impressions), backgroundColor: PALETTE_GRAPHIQUES[0], yAxisID: 'y' },
        { label: 'Revenus (FCFA)', data: lignes.map((f) => f.revenus), backgroundColor: PALETTE_GRAPHIQUES[3], yAxisID: 'y1' },
      ],
    };
  });

  readonly donneesPartenaires = computed<ChartConfiguration['data']>(() => {
    const lignes = this.topPartenaires();
    return {
      labels: lignes.map((p) => p.nom),
      datasets: [
        { label: 'Impressions', data: lignes.map((p) => p.impressions), backgroundColor: PALETTE_GRAPHIQUES[0], xAxisID: 'x' },
        { label: 'Clics', data: lignes.map((p) => p.clics), backgroundColor: PALETTE_GRAPHIQUES[3], xAxisID: 'x1' },
      ],
    };
  });

  readonly donneesPortees = computed<ChartConfiguration['data']>(() => {
    const lignes = this.stats()?.par_portee ?? [];
    return {
      labels: lignes.map((p) => p.libelle),
      datasets: [{ label: 'Impressions', data: lignes.map((p) => p.impressions), backgroundColor: couleursGraphique(lignes.length) }],
    };
  });

  /** 24 barres (0 h à 23 h) : les heures absentes de la réponse valent 0. */
  readonly donneesHeures = computed<ChartConfiguration['data']>(() => {
    const parHeure = new Map((this.stats()?.par_heure ?? []).map((h) => [h.heure, h.impressions]));
    const heures = Array.from({ length: 24 }, (_, h) => h);
    return {
      labels: heures.map((h) => `${h} h`),
      datasets: [{ label: 'Impressions', data: heures.map((h) => parHeure.get(h) ?? 0), backgroundColor: PALETTE_GRAPHIQUES[0] }],
    };
  });

  // ---- Interactions ----

  /** Clic sur une campagne du top 10 : onglet Campagnes, sur son statut, campagne mise en évidence. */
  ouvrirCampagne(campagne: TopCampagneStats): void {
    const statut = ONGLETS_STATUT_PUBLICITE_ADMIN.some((o) => o.valeur === campagne.statut)
      ? campagne.statut
      : undefined;
    this.router.navigate(['/administration/publicites'], { queryParams: { pub: campagne.id, statut } });
  }

  formaterMontant(valeur: number | null | undefined): string {
    return `${formaterNombre(valeur ?? 0)} FCFA`;
  }

  private formaterJour(iso: string): string {
    const [, mois, jour] = iso.split('-');
    return mois && jour ? `${jour}/${mois}` : iso;
  }
}

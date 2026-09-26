import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../partage/graphique/graphique';
import { optionsCliquables } from '../../../../partage/graphique/options-cliquables';
import { CommandesAdminService } from '../commandes-admin.service';
import { formaterDuree, formaterMontant } from '../formater-commande';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  PALETTE_GRAPHIQUES,
  couleursGraphique,
  formaterNombre,
} from '../../tableau-de-bord-admin/palette-graphiques';
import {
  FiltresCommandesAdmin,
  PartenaireDetailCommandes,
  StatsCommandes,
} from '../../../../modeles/commande-admin.model';

/** Ce qu'un clic sur un segment demande au parent : basculer vers « Toutes » avec ce filtre. */
export interface FiltreDepuisGraphique {
  statut?: string;
  partenaire?: { id: number; nom: string };
  departement?: number;
}

const NB_TOP = 10;
const NB_PART_DONUT = 9;

// Couleurs des groupes, alignées sur les badges de statut (orange / indigo / vert / rouge).
const COULEURS_GROUPES = { a_traiter: '#F97316', en_cours: '#4F46E5', terminees: '#10B981', annulees: '#EF4444' };

/**
 * Tableau de bord des commandes (GET stats/, défaut backend 30 jours) : KPI et graphiques
 * Chart.js. Un clic sur un statut, un partenaire ou un département émet `filtrer`.
 */
@Component({
  selector: 'app-tableau-de-bord-commandes',
  imports: [Graphique],
  templateUrl: './tableau-de-bord-commandes.html',
  styleUrl: './tableau-de-bord-commandes.scss',
})
export class TableauBordCommandes {
  private readonly service = inject(CommandesAdminService);

  readonly filtres = input.required<FiltresCommandesAdmin>();
  readonly filtrer = output<FiltreDepuisGraphique>();

  readonly stats = signal<StatsCommandes | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly formaterMontant = formaterMontant;
  readonly formaterNombre = formaterNombre;
  readonly formaterDuree = formaterDuree;

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      untracked(() => this.charger(filtres));
    });
  }

  charger(filtres: FiltresCommandesAdmin = this.filtres()): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.stats(filtres).subscribe({
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

  // ---- Données triées / tronquées (l'index d'un clic renvoie à ces tableaux) ----

  readonly topPartenaires = computed(() =>
    [...(this.stats()?.par_partenaire ?? [])].sort((a, b) => b.nb - a.nb).slice(0, NB_TOP),
  );
  readonly topClients = computed(() =>
    [...(this.stats()?.par_client ?? [])].sort((a, b) => b.nb - a.nb).slice(0, NB_TOP),
  );
  /** Tous les partenaires ayant au moins une commande, par total décroissant. */
  readonly partenairesDetail = computed<PartenaireDetailCommandes[]>(() =>
    [...(this.stats()?.par_partenaire_detail ?? [])].sort((a, b) => b.total - a.total),
  );
  /** Hauteur adaptée au nombre de partenaires (30 px par barre + axes) ; la carte défile au-delà. */
  readonly hauteurPartenairesDetail = computed(() => Math.max(260, this.partenairesDetail().length * 30 + 90));

  readonly departements = computed(() =>
    [...(this.stats()?.par_departement ?? [])].sort((a, b) => b.nb - a.nb),
  );

  // ---- Options ----

  private readonly legendeBas = { legend: { position: 'bottom' as const } };

  readonly optionsJour: ChartConfiguration['options'] = {
    interaction: { mode: 'index', intersect: false },
    plugins: this.legendeBas,
    scales: {
      y: { beginAtZero: true, position: 'left', ticks: { precision: 0 }, title: { display: true, text: 'Commandes' } },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'CA (FCFA)' },
      },
    },
  };

  readonly optionsDonut: ChartConfiguration['options'] = { plugins: this.legendeBas };

  readonly optionsBarres: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  readonly optionsStatut = optionsCliquables((i) => {
    const ligne = this.stats()?.par_statut[i];
    if (ligne) this.filtrer.emit({ statut: ligne.statut });
  }, this.optionsBarres);

  readonly optionsPartenaires = optionsCliquables(
    (i) => {
      const ligne = this.topPartenaires()[i];
      if (ligne) this.filtrer.emit({ partenaire: { id: ligne.id, nom: ligne.nom } });
    },
    {
      indexAxis: 'y',
      plugins: this.legendeBas,
      scales: {
        x: { beginAtZero: true, position: 'bottom', ticks: { precision: 0 }, title: { display: true, text: 'Commandes' } },
        x1: {
          beginAtZero: true,
          position: 'top',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'CA (FCFA)' },
        },
      },
    },
  );

  readonly optionsPartenairesDetail = optionsCliquables(
    (i) => {
      const ligne = this.partenairesDetail()[i];
      if (ligne) this.filtrer.emit({ partenaire: { id: ligne.id, nom: ligne.nom } });
    },
    {
      indexAxis: 'y',
      plugins: {
        ...this.legendeBas,
        tooltip: {
          callbacks: {
            footer: (elements) => {
              const ligne = this.partenairesDetail()[elements[0]?.dataIndex ?? -1];
              return ligne ? `Total : ${ligne.total} · CA : ${formaterMontant(ligne.montant)}` : '';
            },
          },
        },
      },
      scales: {
        x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        y: { stacked: true },
      },
    },
  );

  readonly optionsDepartements = optionsCliquables(
    (i) => {
      const ligne = this.departements()[i];
      if (ligne) this.filtrer.emit({ departement: ligne.id });
    },
    {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  );

  /** Barres horizontales d'effectifs, avec le montant en info-bulle. */
  private optionsAvecMontant(montants: () => number[]): ChartConfiguration['options'] {
    return {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (contexte) => `Montant : ${formaterMontant(montants()[contexte.dataIndex])}`,
          },
        },
      },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    };
  }

  readonly optionsTypes = this.optionsAvecMontant(() => (this.stats()?.par_type_partenaire ?? []).map((t) => t.montant));
  readonly optionsClients = this.optionsAvecMontant(() => this.topClients().map((c) => c.montant));

  // ---- Jeux de données ----

  readonly donneesJour = computed<ChartConfiguration['data']>(() => {
    const jours = this.stats()?.par_jour ?? [];
    return {
      labels: jours.map((j) => this.formaterJour(j.date)),
      datasets: [
        {
          type: 'line',
          label: 'Commandes',
          data: jours.map((j) => j.nb),
          borderColor: PALETTE_GRAPHIQUES[0],
          backgroundColor: PALETTE_GRAPHIQUES[0],
          yAxisID: 'y',
          tension: 0.3,
        },
        {
          type: 'line',
          label: 'Chiffre d’affaires (FCFA)',
          data: jours.map((j) => j.montant),
          borderColor: PALETTE_GRAPHIQUES[3],
          backgroundColor: PALETTE_GRAPHIQUES[3],
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    };
  });

  readonly donneesGroupes = computed(() =>
    this.donut((this.stats()?.par_groupe ?? []).map((g) => [g.libelle, g.nb])),
  );

  readonly donneesModes = computed(() =>
    this.donut((this.stats()?.par_mode_livraison ?? []).map((m) => [m.libelle, m.nb])),
  );

  readonly donneesStatuts = computed(() =>
    this.barres((this.stats()?.par_statut ?? []).map((s) => [s.libelle, s.nb]), 'Commandes'),
  );

  readonly donneesPartenaires = computed<ChartConfiguration['data']>(() => {
    const lignes = this.topPartenaires();
    return {
      labels: lignes.map((p) => p.nom),
      datasets: [
        { label: 'Commandes', data: lignes.map((p) => p.nb), backgroundColor: PALETTE_GRAPHIQUES[0], xAxisID: 'x' },
        { label: 'CA (FCFA)', data: lignes.map((p) => p.montant), backgroundColor: PALETTE_GRAPHIQUES[3], xAxisID: 'x1' },
      ],
    };
  });

  readonly donneesPartenairesDetail = computed<ChartConfiguration['data']>(() => {
    const lignes = this.partenairesDetail();
    const serie = (libelle: string, cle: keyof typeof COULEURS_GROUPES) => ({
      label: libelle,
      data: lignes.map((p) => p[cle]),
      backgroundColor: COULEURS_GROUPES[cle],
    });
    return {
      labels: lignes.map((p) => p.nom),
      datasets: [
        serie('À traiter', 'a_traiter'),
        serie('En cours', 'en_cours'),
        serie('Terminées', 'terminees'),
        serie('Annulées', 'annulees'),
      ],
    };
  });

  /** Part des commandes par partenaire : les 9 premiers + « Autres » (gris). */
  readonly donneesPartPartenaires = computed<ChartConfiguration['data']>(() => {
    const lignes = this.partenairesDetail();
    const premiers = lignes.slice(0, NB_PART_DONUT);
    const autres = lignes.slice(NB_PART_DONUT).reduce((somme, p) => somme + p.total, 0);
    const couleurs = couleursGraphique(premiers.length);
    return {
      labels: autres > 0 ? [...premiers.map((p) => p.nom), 'Autres'] : premiers.map((p) => p.nom),
      datasets: [
        {
          data: autres > 0 ? [...premiers.map((p) => p.total), autres] : premiers.map((p) => p.total),
          backgroundColor: autres > 0 ? [...couleurs, '#9CA3AF'] : couleurs,
        },
      ],
    };
  });

  readonly donneesTypes = computed(() =>
    this.barres((this.stats()?.par_type_partenaire ?? []).map((t) => [t.libelle, t.nb]), 'Commandes'),
  );

  readonly donneesClients = computed(() =>
    this.barres(this.topClients().map((c) => [c.nom, c.nb]), 'Commandes'),
  );

  /** 24 barres (0 h à 23 h) : les heures absentes de la réponse valent 0. */
  readonly donneesHeures = computed(() => {
    const parHeure = new Map((this.stats()?.par_heure ?? []).map((h) => [h.heure, h.nb]));
    const heures = Array.from({ length: 24 }, (_, h) => h);
    return this.barres(heures.map((h) => [`${h} h`, parHeure.get(h) ?? 0]), 'Commandes');
  });

  readonly donneesJoursSemaine = computed(() =>
    this.barres(
      [...(this.stats()?.par_jour_semaine ?? [])].sort((a, b) => a.jour - b.jour).map((j) => [j.libelle, j.nb]),
      'Commandes',
    ),
  );

  readonly donneesDepartements = computed(() =>
    this.barres(this.departements().map((d) => [d.nom, d.nb]), 'Commandes'),
  );

  readonly aDesHeures = computed(() => (this.stats()?.par_heure ?? []).some((h) => h.nb > 0));

  private formaterJour(iso: string): string {
    const [, mois, jour] = iso.split('-');
    return mois && jour ? `${jour}/${mois}` : iso;
  }

  private donut(entrees: [string, number][]): ChartConfiguration['data'] {
    return {
      labels: entrees.map(([libelle]) => libelle),
      datasets: [{ data: entrees.map(([, n]) => n), backgroundColor: couleursGraphique(entrees.length) }],
    };
  }

  private barres(entrees: [string, number][], etiquette: string): ChartConfiguration['data'] {
    return {
      labels: entrees.map(([libelle]) => libelle),
      datasets: [
        { label: etiquette, data: entrees.map(([, n]) => n), backgroundColor: couleursGraphique(entrees.length) },
      ],
    };
  }
}

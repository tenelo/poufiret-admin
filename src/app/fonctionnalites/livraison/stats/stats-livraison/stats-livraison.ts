import { Component, computed, input, output, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../partage/graphique/graphique';
import { formaterFcfa } from '../../formatage-livraison';
import { couleursGraphique, formaterNombre } from '../palette-graphiques-livraison';
import { ModeAffichageStats, StatsLivraisonDonnees } from '../../modeles/stats-livraison.model';

type UniteCa = 'jour' | 'mois' | 'heure';

interface PointGraphique {
  libelle: string;
  valeur: number;
}

/**
 * Composant de statistiques TeneLivr réutilisable, affiché en version
 * allégée (gestionnaire), complète (superviseur) ou coordonnateur (+ top
 * villes) selon `mode`. Purement présentationnel : reçoit des données déjà
 * chargées, émet `periodeChangee` pour que l'écran parent recharge. Module
 * livraison isolé.
 */
@Component({
  selector: 'app-stats-livraison',
  imports: [Graphique],
  templateUrl: './stats-livraison.html',
  styleUrl: './stats-livraison.scss',
})
export class StatsLivraison {
  readonly donnees = input.required<StatsLivraisonDonnees>();
  readonly mode = input.required<ModeAffichageStats>();

  readonly periodeChangee = output<{ debut?: string; fin?: string }>();

  readonly formaterFcfa = formaterFcfa;
  readonly formaterNombre = formaterNombre;

  readonly afficherAnalysesFines = computed(() => this.mode() !== 'allege');
  readonly afficherTopVilles = computed(() => this.mode() === 'coordonnateur');

  // ---- Filtre de période ----
  readonly debutSaisi = signal('');
  readonly finSaisi = signal('');

  changerDebut(valeur: string): void {
    this.debutSaisi.set(valeur);
  }

  changerFin(valeur: string): void {
    this.finSaisi.set(valeur);
  }

  appliquerPeriode(): void {
    this.periodeChangee.emit({ debut: this.debutSaisi() || undefined, fin: this.finSaisi() || undefined });
  }

  // ---- KPI ----

  readonly tauxConversionFormate = computed(() => {
    const ratio = this.donnees().taux_conversion.ratio_courses_par_consultation;
    return `${(ratio * 100).toFixed(1)} %`;
  });

  // ---- Courbe CA par période (bascule jour/mois/heure) ----

  readonly uniteCa = signal<UniteCa>('jour');

  changerUniteCa(unite: UniteCa): void {
    this.uniteCa.set(unite);
  }

  readonly pointsCaActuels = computed<PointGraphique[]>(() => {
    const cap = this.donnees().ca_par_periode;
    switch (this.uniteCa()) {
      case 'jour':
        return cap.par_jour.map((p) => ({ libelle: p.jour, valeur: p.total }));
      case 'mois':
        return cap.par_mois.map((p) => ({ libelle: p.mois, valeur: p.total }));
      case 'heure':
        return cap.par_heure.map((p) => ({ libelle: `${p.heure}h`, valeur: p.total }));
    }
  });

  readonly dataCourbeCa = computed<ChartConfiguration['data']>(() => ({
    labels: this.pointsCaActuels().map((p) => p.libelle),
    datasets: [
      {
        label: 'CA (FCFA)',
        data: this.pointsCaActuels().map((p) => p.valeur),
        borderColor: '#0369a1',
        backgroundColor: 'rgba(3, 105, 161, 0.15)',
        fill: true,
        tension: 0.3,
      },
    ],
  }));

  readonly optionsCourbeCa: ChartConfiguration['options'] = { plugins: { legend: { display: false } } };

  // ---- Stats par livreur (triées par CA décroissant) ----

  readonly statsParLivreurTriees = computed(() =>
    [...this.donnees().stats_par_livreur].sort((a, b) => b.ca_genere - a.ca_genere),
  );

  readonly dataBarresLivreurs = computed<ChartConfiguration['data']>(() => {
    const liste = this.statsParLivreurTriees();
    return {
      labels: liste.map((l) => l.livreur_nom),
      datasets: [
        { label: 'CA généré (FCFA)', data: liste.map((l) => l.ca_genere), backgroundColor: couleursGraphique(liste.length) },
      ],
    };
  });

  readonly optionsBarresLivreurs: ChartConfiguration['options'] = { plugins: { legend: { display: false } } };

  // ---- Répartition demandeurs (donut, complet/coordonnateur) ----

  readonly dataDonutDemandeurs = computed<ChartConfiguration['data']>(() => {
    const r = this.donnees().repartition_demandeurs;
    return {
      labels: ['Client', 'Partenaire', 'Bureau'],
      datasets: [{ data: [r.client, r.partenaire, r.bureau], backgroundColor: couleursGraphique(3) }],
    };
  });

  readonly totalDemandeurs = computed(() => {
    const r = this.donnees().repartition_demandeurs;
    return r.client + r.partenaire + r.bureau;
  });

  // ---- Top quartiers de départ (barres, complet/coordonnateur) ----

  readonly dataBarresTopQuartiers = computed<ChartConfiguration['data']>(() =>
    this.construireBarres(this.donnees().top_quartiers_depart.map((q) => ({ libelle: q.quartier, valeur: q.nb_courses }))),
  );

  // ---- Top catégories partenaire (barres, complet/coordonnateur) ----

  readonly dataBarresTopCategories = computed<ChartConfiguration['data']>(() =>
    this.construireBarres(
      this.donnees().top_categories_partenaire.map((c) => ({ libelle: c.categorie, valeur: c.nb_courses })),
    ),
  );

  // ---- Top villes (barres, coordonnateur seulement) ----

  readonly dataBarresTopVilles = computed<ChartConfiguration['data']>(() =>
    this.construireBarres(this.donnees().top_villes.map((v) => ({ libelle: v.ville, valeur: v.nb_courses }))),
  );

  readonly optionsBarresHorizontales: ChartConfiguration['options'] = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
  };

  private construireBarres(points: PointGraphique[]): ChartConfiguration['data'] {
    return {
      labels: points.map((p) => p.libelle),
      datasets: [{ label: 'Nb courses', data: points.map((p) => p.valeur), backgroundColor: couleursGraphique(points.length) }],
    };
  }
}

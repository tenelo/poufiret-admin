import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { IndicateursPartenairesService } from './indicateurs-partenaires.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { couleursGraphique, formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import { IndicateursPartenaires } from '../../../modeles/indicateurs-partenaires.model';

interface TrancheExpiration {
  libelle: string;
  valeur: number;
  classe: string;
}

/**
 * Écran "Indicateurs partenaires" : vue d'ensemble en lecture seule
 * (GET /administration/partenaires/) + export CSV.
 */
@Component({
  selector: 'app-indicateurs-partenaires',
  imports: [Graphique],
  templateUrl: './indicateurs-partenaires.html',
  styleUrl: './indicateurs-partenaires.scss',
})
export class IndicateursPartenairesComponent implements OnInit {
  private readonly service = inject(IndicateursPartenairesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly donnees = signal<IndicateursPartenaires | null>(null);

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  readonly formaterNombre = formaterNombre;

  readonly optionsDonut: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  readonly optionsBarresHorizontales: ChartConfiguration['options'] = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.charger().subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  exporter(): void {
    if (this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv().subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }

  readonly donneesParPlan = computed<ChartConfiguration['data']>(() =>
    this.dictVersDonut(this.donnees()?.par_plan ?? {}),
  );

  readonly donneesParStatut = computed<ChartConfiguration['data']>(() =>
    this.dictVersDonut(this.donnees()?.par_statut ?? {}),
  );

  readonly donneesParType = computed<ChartConfiguration['data']>(() =>
    this.dictVersBarres(this.donnees()?.par_type ?? {}, '#1B5E20'),
  );

  readonly donneesParDepartement = computed<ChartConfiguration['data']>(() =>
    this.dictVersBarres(this.donnees()?.par_departement ?? {}, '#E65100'),
  );

  readonly listeExpirations = computed<TrancheExpiration[]>(() => {
    const e = this.donnees()?.expirations;
    return [
      { libelle: 'Déjà expiré', valeur: e?.deja_expire ?? 0, classe: 'urgence-critique' },
      { libelle: 'Demain', valeur: e?.demain ?? 0, classe: 'urgence-haute' },
      { libelle: 'Sous 5 jours', valeur: e?.sous_5j ?? 0, classe: 'urgence-moyenne' },
      { libelle: 'Sous 15 jours', valeur: e?.sous_15j ?? 0, classe: 'urgence-basse' },
      { libelle: 'Sous 30 jours', valeur: e?.sous_30j ?? 0, classe: 'urgence-neutre' },
    ];
  });

  private dictVersDonut(dict: Record<string, number>): ChartConfiguration['data'] {
    const entrees = Object.entries(dict).sort(([, a], [, b]) => b - a);
    return {
      labels: entrees.map(([cle]) => this.formaterCle(cle)),
      datasets: [
        {
          data: entrees.map(([, valeur]) => valeur),
          backgroundColor: couleursGraphique(entrees.length),
        },
      ],
    };
  }

  private dictVersBarres(dict: Record<string, number>, couleur: string): ChartConfiguration['data'] {
    const entrees = Object.entries(dict).sort(([, a], [, b]) => b - a);
    return {
      labels: entrees.map(([cle]) => this.formaterCle(cle)),
      datasets: [
        {
          label: 'Partenaires',
          data: entrees.map(([, valeur]) => valeur),
          backgroundColor: couleur,
        },
      ],
    };
  }

  /** Affiche une clé de dictionnaire backend de façon lisible, sans table de correspondance. */
  private formaterCle(cle: string): string {
    const avecEspaces = cle.replace(/_/g, ' ');
    return avecEspaces.charAt(0).toUpperCase() + avecEspaces.slice(1);
  }
}

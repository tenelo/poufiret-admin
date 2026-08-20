import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { StatsConnexionService } from './stats-connexion.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import { StatsConnexion } from '../../../modeles/stats-connexion.model';
import { OuverturesPeriodeAdmin } from '../../../modeles/tableau-bord-admin.model';

interface CartePeriode {
  libelle: string;
  connexionsDistinctes: number;
  ouvertures: OuverturesPeriodeAdmin;
}

/**
 * Écran "Stats de connexion" : résumé synthétique (GET /analytics/admin/stats-connexion/)
 * centré sur l'export CSV détaillé des sessions. Volontairement léger pour ne
 * pas dupliquer le tableau de bord admin (pas de graphiques par rôle ici).
 */
@Component({
  selector: 'app-stats-connexion',
  imports: [Graphique],
  templateUrl: './stats-connexion.html',
  styleUrl: './stats-connexion.scss',
})
export class StatsConnexionComponent implements OnInit {
  private readonly service = inject(StatsConnexionService);
  private readonly permissionsService = inject(PermissionsService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly donnees = signal<StatsConnexion | null>(null);

  readonly formaterNombre = formaterNombre;

  readonly joursInput = signal('');
  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  readonly peutExporter = computed(() => this.permissionsService.aLaCapacite('exporter_csv'));
  readonly infobulleExport = computed(() =>
    this.peutExporter() ? '' : "Vous n'avez pas la capacité exporter_csv.",
  );

  readonly optionsBarres: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  readonly donneesConnexionsPeriodes = computed<ChartConfiguration['data']>(() => {
    const cd = this.donnees()?.connexions_distinctes;
    return {
      labels: ["Aujourd'hui", '7 jours', '30 jours'],
      datasets: [
        {
          label: 'Connexions distinctes',
          data: [cd?.aujourdhui.total ?? 0, cd?.sept_jours.total ?? 0, cd?.trente_jours.total ?? 0],
          backgroundColor: '#1B5E20',
        },
      ],
    };
  });

  readonly cartesPeriodes = computed<CartePeriode[]>(() => {
    const d = this.donnees();
    const periodeVide: OuverturesPeriodeAdmin = { total: 0, personnes: 0, moyenne_par_personne: 0 };
    return [
      {
        libelle: "Aujourd'hui",
        connexionsDistinctes: d?.connexions_distinctes.aujourdhui.total ?? 0,
        ouvertures: d?.ouvertures.aujourdhui ?? periodeVide,
      },
      {
        libelle: '7 jours',
        connexionsDistinctes: d?.connexions_distinctes.sept_jours.total ?? 0,
        ouvertures: d?.ouvertures.sept_jours ?? periodeVide,
      },
      {
        libelle: '30 jours',
        connexionsDistinctes: d?.connexions_distinctes.trente_jours.total ?? 0,
        ouvertures: d?.ouvertures.trente_jours ?? periodeVide,
      },
    ];
  });

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

  formaterDateGeneration(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  changerJours(valeur: string): void {
    this.joursInput.set(valeur);
  }

  exporter(): void {
    if (!this.peutExporter() || this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv(this.parseJours()).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }

  /** N valide (entier positif) uniquement ; sinon undefined — on ignore sans bloquer. */
  private parseJours(): number | undefined {
    const brut = this.joursInput().trim();
    if (!brut) {
      return undefined;
    }
    const nombre = Number(brut);
    return Number.isInteger(nombre) && nombre > 0 ? nombre : undefined;
  }
}

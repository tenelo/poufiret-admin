import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { StatsConnexionService } from './stats-connexion.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import {
  COULEUR_PRINCIPALE,
  COULEUR_PRINCIPALE_TRANSPARENTE,
  formaterDuree,
  formaterNombre,
} from '../tableau-de-bord-admin/palette-graphiques';
import { StatsConnexion } from '../../../modeles/stats-connexion.model';
import { OuverturesPeriodeAdmin } from '../../../modeles/tableau-bord-admin.model';
import { DureeParUtilisateur, DureeSessions } from '../../../modeles/duree-sessions.model';

interface CartePeriode {
  libelle: string;
  connexionsDistinctes: number;
  ouvertures: OuverturesPeriodeAdmin;
}

type ColonneTriDurees = 'duree_totale_secondes' | 'nb_sessions';

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

  // ---- Section "Durée des sessions" (GET /analytics/admin/duree-sessions/) ----
  // Réutilise le même filtre `joursInput`/`parseJours()` que l'export ci-dessus.
  readonly chargementDureesEnCours = signal(true);
  readonly erreurDurees = signal<string | null>(null);
  readonly durees = signal<DureeSessions | null>(null);

  readonly exportDureesEnCours = signal(false);
  readonly erreurExportDurees = signal<string | null>(null);

  readonly formaterDuree = formaterDuree;

  readonly triColonneDurees = signal<ColonneTriDurees>('duree_totale_secondes');
  readonly triDirectionDurees = signal<'asc' | 'desc'>('desc');

  readonly parUtilisateurTrie = computed<DureeParUtilisateur[]>(() => {
    const liste = [...(this.durees()?.par_utilisateur ?? [])];
    const colonne = this.triColonneDurees();
    const sens = this.triDirectionDurees() === 'asc' ? 1 : -1;
    return liste.sort((a, b) => (a[colonne] - b[colonne]) * sens);
  });

  readonly optionsCourbeDurees: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Durée moyenne (minutes)' } },
    },
  };

  readonly donneesCourbeDurees = computed<ChartConfiguration['data']>(() => {
    const parJour = this.durees()?.par_jour ?? [];
    return {
      labels: parJour.map((point) => this.formaterDateCourte(point.date)),
      datasets: [
        {
          label: 'Durée moyenne (min)',
          data: parJour.map((point) => Math.round((point.duree_moyenne_secondes / 60) * 10) / 10),
          borderColor: COULEUR_PRINCIPALE,
          backgroundColor: COULEUR_PRINCIPALE_TRANSPARENTE,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

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
          backgroundColor: COULEUR_PRINCIPALE,
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
    this.chargerDurees();
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

  // ---- Section "Durée des sessions" ----

  chargerDurees(): void {
    this.chargementDureesEnCours.set(true);
    this.erreurDurees.set(null);

    this.service.chargerDurees(this.parseJours()).subscribe({
      next: (durees) => {
        this.chargementDureesEnCours.set(false);
        this.durees.set(durees);
      },
      error: (erreur: unknown) => {
        this.chargementDureesEnCours.set(false);
        this.erreurDurees.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerTriDurees(colonne: ColonneTriDurees): void {
    if (this.triColonneDurees() === colonne) {
      this.triDirectionDurees.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.triColonneDurees.set(colonne);
      this.triDirectionDurees.set('desc');
    }
  }

  exporterDurees(): void {
    if (!this.peutExporter() || this.exportDureesEnCours()) {
      return;
    }
    this.exportDureesEnCours.set(true);
    this.erreurExportDurees.set(null);

    this.service.exporterDurees(this.parseJours()).subscribe({
      next: () => this.exportDureesEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportDureesEnCours.set(false);
        this.erreurExportDurees.set(extraireMessageErreur(erreur));
      },
    });
  }

  private formaterDateCourte(iso: string): string {
    const [, mois, jour] = iso.split('-');
    return jour && mois ? `${jour}/${mois}` : iso;
  }
}

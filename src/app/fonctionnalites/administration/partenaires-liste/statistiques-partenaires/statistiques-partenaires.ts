import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { Graphique } from '../../../../partage/graphique/graphique';
import { PartenairesListeService } from '../partenaires-liste.service';
import { TableauDeBordAdminService } from '../../tableau-de-bord-admin/tableau-de-bord-admin.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  COULEUR_PRINCIPALE,
  COULEUR_SECONDAIRE,
  couleursGraphique,
  formaterNombre,
} from '../../tableau-de-bord-admin/palette-graphiques';
import { PartenaireListe } from '../../../../modeles/partenaire-liste.model';
import { TableauBordAdmin } from '../../../../modeles/tableau-bord-admin.model';

const NB_MAX_BARRES = 8;

/**
 * Onglet "Statistiques" du menu Partenaires : proportions clients / partenaires et activité
 * comparée (GET /administration/dashboard/), puis répartition des partenaires calculée sur la
 * liste complète (GET /administration/partenaires/liste/). Les deux sources se chargent
 * indépendamment : l'échec de l'une (ex. capacité manquante) n'empêche pas d'afficher l'autre.
 */
@Component({
  selector: 'app-statistiques-partenaires',
  imports: [Graphique],
  templateUrl: './statistiques-partenaires.html',
  styleUrl: './statistiques-partenaires.scss',
})
export class StatistiquesPartenaires implements OnInit {
  private readonly tableauBordService = inject(TableauDeBordAdminService);
  private readonly partenairesService = inject(PartenairesListeService);

  readonly dashboard = signal<TableauBordAdmin | null>(null);
  readonly erreurDashboard = signal<string | null>(null);
  readonly partenaires = signal<PartenaireListe[] | null>(null);
  readonly erreurPartenaires = signal<string | null>(null);
  readonly chargementEnCours = signal(false);

  readonly formaterNombre = formaterNombre;

  readonly optionsDonut: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };
  readonly optionsBarres: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  readonly optionsBarresHorizontales: ChartConfiguration['options'] = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  // ---- Partenaires + clients (comptes) ----

  readonly nbClients = computed(() => this.dashboard()?.comptes.par_role.client ?? 0);
  readonly nbPartenaires = computed(() => this.dashboard()?.comptes.par_role.partenaire ?? 0);

  /** "N clients par partenaire", ou null s'il n'y a aucun partenaire. */
  readonly clientsParPartenaire = computed(() => {
    const partenaires = this.nbPartenaires();
    return partenaires === 0
      ? null
      : (this.nbClients() / partenaires).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  });

  readonly donneesRoles = computed<ChartConfiguration['data']>(() => {
    const roles = this.dashboard()?.comptes.par_role;
    return {
      labels: ['Clients', 'Partenaires', 'Livreurs', 'Admins'],
      datasets: [
        {
          data: [roles?.client ?? 0, roles?.partenaire ?? 0, roles?.livreur ?? 0, roles?.admin ?? 0],
          backgroundColor: couleursGraphique(4),
        },
      ],
    };
  });

  /** Clients vs partenaires : en ligne maintenant et connexions distinctes par période. */
  readonly donneesActivite = computed<ChartConfiguration['data']>(() => {
    const d = this.dashboard();
    const valeurs = (role: 'client' | 'partenaire') => [
      d?.en_ligne.par_role[role] ?? 0,
      d?.connexions_distinctes.aujourdhui.par_role[role] ?? 0,
      d?.connexions_distinctes.sept_jours.par_role[role] ?? 0,
      d?.connexions_distinctes.trente_jours.par_role[role] ?? 0,
    ];
    return {
      labels: ['En ligne maintenant', "Connectés aujourd'hui", 'Connectés sur 7 j', 'Connectés sur 30 j'],
      datasets: [
        { label: 'Clients', data: valeurs('client'), backgroundColor: COULEUR_PRINCIPALE },
        { label: 'Partenaires', data: valeurs('partenaire'), backgroundColor: COULEUR_SECONDAIRE },
      ],
    };
  });

  // ---- Partenaires (liste complète) ----

  readonly totalPartenaires = computed(() => this.partenaires()?.length ?? 0);
  readonly nbCertifies = computed(() => this.compter((p) => p.badge_certifie));
  readonly nbEnFaveur = computed(() => this.compter((p) => p.est_faveur));
  readonly nbVisibles = computed(() => this.compter((p) => p.est_visible));
  readonly nbActifs = computed(() => this.compter((p) => p.statut === 'actif'));

  readonly donneesStatuts = computed(() => this.donut(this.repartition((p) => p.statut_libelle)));
  readonly donneesPlans = computed(() => this.donut(this.repartition((p) => p.plan_libelle)));
  readonly donneesTypes = computed(() =>
    this.barres(this.repartition((p) => p.type_partenaire_libelle || p.type_partenaire), 'Partenaires'),
  );
  readonly donneesDepartements = computed(() =>
    this.barres(this.repartition((p) => p.departement_nom), 'Partenaires'),
  );

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurDashboard.set(null);
    this.erreurPartenaires.set(null);
    let restantes = 2;
    const termine = () => {
      restantes -= 1;
      if (restantes === 0) {
        this.chargementEnCours.set(false);
      }
    };

    this.tableauBordService.charger().subscribe({
      next: (donnees) => {
        this.dashboard.set(donnees);
        termine();
      },
      error: (erreur: unknown) => {
        this.erreurDashboard.set(extraireMessageErreur(erreur));
        termine();
      },
    });

    this.partenairesService.lister().subscribe({
      next: (reponse) => {
        this.partenaires.set(reponse.resultats ?? []);
        termine();
      },
      error: (erreur: unknown) => {
        this.erreurPartenaires.set(extraireMessageErreur(erreur));
        termine();
      },
    });
  }

  private compter(critere: (p: PartenaireListe) => boolean): number {
    return (this.partenaires() ?? []).filter(critere).length;
  }

  /** Effectifs par libellé (valeur vide → "Non renseigné"), du plus fréquent au moins fréquent. */
  private repartition(cle: (p: PartenaireListe) => string): [string, number][] {
    const effectifs = new Map<string, number>();
    for (const partenaire of this.partenaires() ?? []) {
      const libelle = cle(partenaire)?.trim() || 'Non renseigné';
      effectifs.set(libelle, (effectifs.get(libelle) ?? 0) + 1);
    }
    return [...effectifs.entries()].sort(([, a], [, b]) => b - a);
  }

  private donut(entrees: [string, number][]): ChartConfiguration['data'] {
    return {
      labels: entrees.map(([libelle]) => libelle),
      datasets: [{ data: entrees.map(([, n]) => n), backgroundColor: couleursGraphique(entrees.length) }],
    };
  }

  private barres(entrees: [string, number][], etiquette: string): ChartConfiguration['data'] {
    const retenues = entrees.slice(0, NB_MAX_BARRES);
    return {
      labels: retenues.map(([libelle]) => libelle),
      datasets: [
        {
          label: etiquette,
          data: retenues.map(([, n]) => n),
          backgroundColor: couleursGraphique(retenues.length),
        },
      ],
    };
  }
}

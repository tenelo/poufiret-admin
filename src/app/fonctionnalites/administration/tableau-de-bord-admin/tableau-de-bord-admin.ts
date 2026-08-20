import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { TableauDeBordAdminService } from './tableau-de-bord-admin.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { extraireMessageErreur } from './extraire-message-erreur';
import { PALETTE_GRAPHIQUES, couleursGraphique, formaterNombre } from './palette-graphiques';
import {
  ConnexionsPeriodeAdmin,
  OuverturesPeriodeAdmin,
  RepartitionParRole,
  TableauBordAdmin,
} from '../../../modeles/tableau-bord-admin.model';

const PERIODE_VIDE: ConnexionsPeriodeAdmin = {
  total: 0,
  par_role: { client: 0, partenaire: 0, livreur: 0, admin: 0 },
};

const ROLES: { cle: keyof RepartitionParRole; libelle: string }[] = [
  { cle: 'client', libelle: 'Clients' },
  { cle: 'partenaire', libelle: 'Partenaires' },
  { cle: 'livreur', libelle: 'Livreurs' },
  { cle: 'admin', libelle: 'Admins' },
];

const LIBELLES_PLATEFORME: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
  autre: 'Autre',
};

/**
 * Tableau de bord admin : activité comptes/connexions/appareils, en lecture
 * seule (GET /administration/dashboard/). Ne couvre pas la livraison,
 * traitée par une plateforme séparée.
 */
@Component({
  selector: 'app-tableau-de-bord-admin',
  imports: [Graphique],
  templateUrl: './tableau-de-bord-admin.html',
  styleUrl: './tableau-de-bord-admin.scss',
})
export class TableauDeBordAdmin implements OnInit {
  private readonly service = inject(TableauDeBordAdminService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly donnees = signal<TableauBordAdmin | null>(null);

  readonly formaterNombre = formaterNombre;
  readonly rolesLibelles = ROLES;

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

  readonly donneesEnLigneParRole = computed<ChartConfiguration['data']>(() =>
    this.repartitionVersChart(this.donnees()?.en_ligne.par_role),
  );

  readonly donneesComptesParRole = computed<ChartConfiguration['data']>(() =>
    this.repartitionVersChart(this.donnees()?.comptes.par_role),
  );

  readonly donneesConnexions = computed<ChartConfiguration['data']>(() => {
    const cd = this.donnees()?.connexions_distinctes;
    const periodes: ConnexionsPeriodeAdmin[] = cd
      ? [cd.aujourdhui, cd.sept_jours, cd.trente_jours]
      : [PERIODE_VIDE, PERIODE_VIDE, PERIODE_VIDE];

    return {
      labels: ['Aujourd\'hui', '7 jours', '30 jours'],
      datasets: ROLES.map((role, index) => ({
        label: role.libelle,
        data: periodes.map((periode) => periode.par_role[role.cle]),
        backgroundColor: PALETTE_GRAPHIQUES[index % PALETTE_GRAPHIQUES.length],
      })),
    };
  });

  readonly optionsConnexions: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  readonly optionsDonut: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  readonly donneesPlateformes = computed<ChartConfiguration['data']>(() => {
    const parPlateforme = this.donnees()?.appareils.par_plateforme ?? {};
    const entrees = Object.entries(parPlateforme);
    return {
      labels: entrees.map(([cle]) => LIBELLES_PLATEFORME[cle] ?? cle),
      datasets: [
        {
          data: entrees.map(([, valeur]) => valeur),
          backgroundColor: couleursGraphique(entrees.length),
        },
      ],
    };
  });

  readonly listeConnexionsTotaux = computed<{ libelle: string; total: number }[]>(() => {
    const cd = this.donnees()?.connexions_distinctes;
    return [
      { libelle: "Aujourd'hui", total: cd?.aujourdhui.total ?? 0 },
      { libelle: '7 jours', total: cd?.sept_jours.total ?? 0 },
      { libelle: '30 jours', total: cd?.trente_jours.total ?? 0 },
    ];
  });

  readonly listeOuvertures = computed<{ libelle: string; donnees: OuverturesPeriodeAdmin }[]>(() => {
    const o = this.donnees()?.ouvertures;
    const vide: OuverturesPeriodeAdmin = { total: 0, personnes: 0, moyenne_par_personne: 0 };
    return [
      { libelle: "Aujourd'hui", donnees: o?.aujourdhui ?? vide },
      { libelle: '7 jours', donnees: o?.sept_jours ?? vide },
      { libelle: '30 jours', donnees: o?.trente_jours ?? vide },
    ];
  });

  private repartitionVersChart(repartition: RepartitionParRole | undefined): ChartConfiguration['data'] {
    const valeurs = repartition ?? { client: 0, partenaire: 0, livreur: 0, admin: 0 };
    return {
      labels: ROLES.map((r) => r.libelle),
      datasets: [
        {
          data: ROLES.map((r) => valeurs[r.cle]),
          backgroundColor: couleursGraphique(ROLES.length),
        },
      ],
    };
  }
}

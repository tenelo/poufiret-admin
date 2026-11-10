import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { PartenairesListeService } from '../partenaires-liste/partenaires-liste.service';
import { Departement } from '../../../modeles/departement.model';
import { FiltresStatistiquesUsage, PeriodeUsageChoix } from '../../../modeles/statistiques-usage.model';
import { bornesPeriodeUsage } from './periode-usage';
import { ResumeUsageSection } from './resume-usage/resume-usage';
import { ActiviteUsageSection } from './activite-usage/activite-usage';
import { RecherchesUsageSection } from './recherches-usage/recherches-usage';
import { EntonnoirUsageSection } from './entonnoir-usage/entonnoir-usage';
import { PartenairesUsageSection } from './partenaires-usage/partenaires-usage';

/**
 * Écran admin "Statistiques d'usage" (GET /administration/statistiques-usage/..., capacité
 * voir_stats) : résumé, activité, recherches, entonnoir panier → commande → livraison et
 * tableau des partenaires. Ce composant porte uniquement le filtre période/département,
 * partagé via `[filtres]` ; chaque section ci-dessous appelle elle-même son propre endpoint.
 */
@Component({
  selector: 'app-statistiques-usage',
  imports: [ResumeUsageSection, ActiviteUsageSection, RecherchesUsageSection, EntonnoirUsageSection, PartenairesUsageSection],
  templateUrl: './statistiques-usage.html',
  styleUrl: './statistiques-usage.scss',
})
export class StatistiquesUsage implements OnInit {
  private readonly partenairesService = inject(PartenairesListeService);

  readonly departements = signal<Departement[]>([]);

  // duPerso/auPerso pré-remplies (30 derniers jours) : des bornes valides sont envoyées même si
  // l'admin passe sur "Personnalisée" sans toucher aux dates.
  private readonly bornesParDefaut = bornesPeriodeUsage('30j', '', '');

  readonly periodeChoix = signal<PeriodeUsageChoix>('30j');
  readonly duPerso = signal(this.bornesParDefaut.du);
  readonly auPerso = signal(this.bornesParDefaut.au);
  readonly departement = signal<number | ''>('');

  readonly filtres = computed<FiltresStatistiquesUsage>(() => {
    const { du, au } = bornesPeriodeUsage(this.periodeChoix(), this.duPerso(), this.auPerso());
    return { du, au, departement: this.departement() };
  });

  ngOnInit(): void {
    this.partenairesService
      .listerDepartements()
      .pipe(catchError(() => of([] as Departement[])))
      .subscribe((liste) => this.departements.set(liste));
  }

  changerPeriode(valeur: string): void {
    this.periodeChoix.set(valeur as PeriodeUsageChoix);
  }

  changerDuPerso(valeur: string): void {
    this.duPerso.set(valeur);
  }

  changerAuPerso(valeur: string): void {
    this.auPerso.set(valeur);
  }

  changerDepartement(valeur: string): void {
    this.departement.set(valeur === '' ? '' : Number(valeur));
  }
}

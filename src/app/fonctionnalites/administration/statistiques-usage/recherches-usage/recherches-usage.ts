import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StatistiquesUsageService } from '../statistiques-usage.service';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterNombre, formaterTaux } from '../../tableau-de-bord-admin/palette-graphiques';
import { FiltresStatistiquesUsage, RecherchesUsage } from '../../../../modeles/statistiques-usage.model';

/** Recherches (GET recherches/) : top termes et termes sans résultat, avec accès au dictionnaire. */
@Component({
  selector: 'app-recherches-usage',
  imports: [RouterLink],
  templateUrl: './recherches-usage.html',
  styleUrl: './recherches-usage.scss',
})
export class RecherchesUsageSection {
  private readonly service = inject(StatistiquesUsageService);
  private readonly permissionsService = inject(PermissionsService);

  readonly filtres = input.required<FiltresStatistiquesUsage>();

  readonly donnees = signal<RecherchesUsage | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly peutOuvrirDictionnaire = computed(() => this.permissionsService.aLaCapacite('gerer_parametres'));

  readonly formaterNombre = formaterNombre;
  readonly formaterTaux = formaterTaux;

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      untracked(() => this.charger(filtres));
    });
  }

  formaterDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private charger(filtres: FiltresStatistiquesUsage): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.recherches(filtres).subscribe({
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
}

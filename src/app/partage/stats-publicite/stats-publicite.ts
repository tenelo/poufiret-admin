import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { DonneesStatsPublicite } from '../../modeles/publicite.model';

/**
 * Bloc de statistiques d'une campagne (affichages, clics, taux de clic, personnes touchées,
 * cible, répartition par type d'emplacement, période de diffusion), partagé entre l'espace
 * partenaire (Points des publicités) et l'espace admin (cartes Campagnes).
 */
@Component({
  selector: 'app-stats-publicite',
  imports: [DatePipe],
  templateUrl: './stats-publicite.html',
  styleUrl: './stats-publicite.scss',
})
export class StatsPublicite {
  readonly stats = input.required<DonneesStatsPublicite>();

  /** Entrées {type, valeur} d'une répartition d'impressions par emplacement, pour les mini-barres. */
  entreesImpressionsParType(impressions: Record<string, number> | undefined): { type: string; valeur: number }[] {
    return Object.entries(impressions ?? {}).map(([type, valeur]) => ({ type, valeur }));
  }

  pourcentageBarre(valeur: number, impressions: Record<string, number> | undefined): number {
    const maxValeur = Math.max(1, ...Object.values(impressions ?? {}));
    return Math.round((valeur / maxValeur) * 100);
  }

  formaterNombre(valeur: number | undefined): string {
    return Math.round(valeur ?? 0).toLocaleString('fr-FR');
  }
}

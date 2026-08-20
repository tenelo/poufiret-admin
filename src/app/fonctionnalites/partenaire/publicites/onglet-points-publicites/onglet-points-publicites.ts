import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { OngletPointsPublicitesService } from './onglet-points-publicites.service';
import { extraireMessageErreur } from '../../mes-produits/extraire-message-erreur';
import { StatistiquePublicite, estStatistiqueDetaillee } from '../../../../modeles/publicite.model';

/**
 * Onglet "Points des Publicités" : statistiques des campagnes du partenaire
 * connecté (impressions, clics, cible atteinte...). Lecture seule — la
 * création/soumission de campagnes se fait dans l'onglet "Gérer mes publicités".
 */
@Component({
  selector: 'app-onglet-points-publicites',
  imports: [DatePipe],
  templateUrl: './onglet-points-publicites.html',
  styleUrl: './onglet-points-publicites.scss',
})
export class OngletPointsPublicites implements OnInit {
  private readonly service = inject(OngletPointsPublicitesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly publicites = signal<StatistiquePublicite[]>([]);

  readonly estDetaillee = estStatistiqueDetaillee;

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.chargerStats().subscribe({
      next: (publicites) => {
        this.chargementEnCours.set(false);
        this.publicites.set(publicites);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  /** Entrées {type, valeur} d'une répartition d'impressions par emplacement, pour les mini-barres. */
  entreesImpressionsParType(impressions: Record<string, number>): { type: string; valeur: number }[] {
    return Object.entries(impressions).map(([type, valeur]) => ({ type, valeur }));
  }

  pourcentageBarre(valeur: number, impressions: Record<string, number>): number {
    const maxValeur = Math.max(1, ...Object.values(impressions));
    return Math.round((valeur / maxValeur) * 100);
  }
}

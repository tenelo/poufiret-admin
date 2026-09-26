import { Component, OnInit, inject, signal } from '@angular/core';
import { StatsPublicite } from '../../../../partage/stats-publicite/stats-publicite';

import { OngletPointsPublicitesService } from './onglet-points-publicites.service';
import { extraireMessageErreur } from '../../mes-produits/extraire-message-erreur';
import {
  StatistiquePublicite,
  StatistiquePubliciteDetaillee,
  estStatistiqueDetaillee,
  libelleStatutPublicite,
} from '../../../../modeles/publicite.model';

/**
 * Onglet "Points des Publicités" : statistiques des campagnes du partenaire
 * connecté (impressions, clics, cible atteinte...). Lecture seule — la
 * création/soumission de campagnes se fait dans l'onglet "Gérer mes publicités".
 */
@Component({
  selector: 'app-onglet-points-publicites',
  imports: [StatsPublicite],
  templateUrl: './onglet-points-publicites.html',
  styleUrl: './onglet-points-publicites.scss',
})
export class OngletPointsPublicites implements OnInit {
  private readonly service = inject(OngletPointsPublicitesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly publicites = signal<StatistiquePublicite[]>([]);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  // ---- Masquage (retrait des listes) ----
  readonly publiciteASupprimer = signal<StatistiquePublicite | null>(null);
  readonly suppressionEnCours = signal(false);
  readonly erreurSuppression = signal<string | null>(null);

  readonly libelleStatut = libelleStatutPublicite;

  /**
   * Stats réelles affichées seulement si le backend les a fournies ET si elles sont visibles
   * (stats_visibles : campagne active ou terminée, non masquée par l'admin). Absent = ancien
   * comportement (fondé sur la forme de la réponse).
   */
  estDetaillee(pub: StatistiquePublicite): pub is StatistiquePubliciteDetaillee {
    return estStatistiqueDetaillee(pub) && pub.stats_visibles !== false;
  }

  /** Message quand les stats ne sont pas visibles : celui du backend, sinon un message par défaut. */
  messageStats(pub: StatistiquePublicite): string {
    return 'message' in pub && pub.message ? pub.message : 'Statistiques bientôt disponibles.';
  }

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

  // ---- Masquage (retrait des listes) ----

  demanderSuppression(publicite: StatistiquePublicite): void {
    this.erreurSuppression.set(null);
    this.publiciteASupprimer.set(publicite);
  }

  annulerSuppression(): void {
    this.publiciteASupprimer.set(null);
  }

  confirmerSuppression(): void {
    const publicite = this.publiciteASupprimer();
    if (!publicite || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set(null);
    this.messageErreur.set(null);

    this.service.masquerPublicite(publicite.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.publiciteASupprimer.set(null);
        this.publicites.update((liste) => liste.filter((p) => p.id !== publicite.id));
        this.messageSucces.set(`Campagne "${publicite.titre}" retirée de vos listes.`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set(extraireMessageErreur(erreur));
      },
    });
  }
}

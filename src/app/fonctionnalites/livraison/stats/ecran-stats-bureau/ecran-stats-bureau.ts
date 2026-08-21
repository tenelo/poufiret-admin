import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { StatsLivraisonService } from '../stats-livraison.service';
import { StatsLivraison } from '../stats-livraison/stats-livraison';
import { extraireMessageErreurLivraison } from '../../extraire-message-erreur-livraison';
import { AuthService } from '../../../../noyau/auth/auth.service';
import { NiveauLivraison, niveauDepuisEspace } from '../../niveau-livraison';
import { ModeAffichageStats, StatsLivraisonDonnees } from '../../modeles/stats-livraison.model';

function modeDepuisNiveau(niveau: NiveauLivraison | null): ModeAffichageStats {
  // Superviseur voit tout (sauf le comparatif multi-villes, propre au
  // coordonnateur) ; gestionnaire n'a que les KPI essentiels.
  return niveau === 'superviseur' ? 'complet' : 'allege';
}

/**
 * Écran "Statistiques" du bureau (ville unique) : gestionnaire → mode
 * allégé, superviseur → mode complet, déduit de `espace` (pas des
 * permissions admin Poufiret). Module livraison isolé.
 */
@Component({
  selector: 'app-ecran-stats-bureau',
  imports: [StatsLivraison],
  templateUrl: './ecran-stats-bureau.html',
  styleUrl: './ecran-stats-bureau.scss',
})
export class EcranStatsBureau implements OnInit {
  private readonly service = inject(StatsLivraisonService);
  private readonly authService = inject(AuthService);

  readonly mode = computed<ModeAffichageStats>(() =>
    modeDepuisNiveau(niveauDepuisEspace(this.authService.utilisateur()?.espace)),
  );

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly donnees = signal<StatsLivraisonDonnees | null>(null);

  private debutActuel?: string;
  private finActuel?: string;

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.chargerStatsBureau(this.debutActuel, this.finActuel).subscribe({
      next: (donnees) => {
        this.chargement.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        this.erreur.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  surChangementPeriode(periode: { debut?: string; fin?: string }): void {
    this.debutActuel = periode.debut;
    this.finActuel = periode.fin;
    this.charger();
  }
}

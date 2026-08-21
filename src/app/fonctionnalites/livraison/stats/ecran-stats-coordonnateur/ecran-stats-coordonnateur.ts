import { Component, OnInit, inject, signal } from '@angular/core';

import { StatsLivraisonService } from '../stats-livraison.service';
import { StatsLivraison } from '../stats-livraison/stats-livraison';
import { ComptesLivraisonService } from '../../coordonnateur/comptes-livraison.service';
import { extraireMessageErreurLivraison } from '../../extraire-message-erreur-livraison';
import { Departement } from '../../../../modeles/departement.model';
import { StatsLivraisonDonnees } from '../../modeles/stats-livraison.model';

/**
 * Écran "Statistiques" du coordonnateur : vue nationale, filtrable par ville
 * via un sélecteur en tête (?ville=). Module livraison isolé.
 */
@Component({
  selector: 'app-ecran-stats-coordonnateur',
  imports: [StatsLivraison],
  templateUrl: './ecran-stats-coordonnateur.html',
  styleUrl: './ecran-stats-coordonnateur.scss',
})
export class EcranStatsCoordonnateur implements OnInit {
  private readonly service = inject(StatsLivraisonService);
  private readonly comptesService = inject(ComptesLivraisonService);

  readonly departements = signal<Departement[]>([]);
  readonly villeSelectionneeId = signal<number | null>(null);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly donnees = signal<StatsLivraisonDonnees | null>(null);

  private debutActuel?: string;
  private finActuel?: string;

  ngOnInit(): void {
    this.comptesService.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => {
        // Non bloquant : sans départements, le sélecteur n'affiche que
        // "Toutes les villes" et les stats nationales restent utilisables.
      },
    });
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service
      .chargerStatsCoordonnateur(this.debutActuel, this.finActuel, this.villeSelectionneeId() ?? undefined)
      .subscribe({
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

  changerVille(valeur: string): void {
    this.villeSelectionneeId.set(valeur ? Number(valeur) : null);
    this.charger();
  }

  surChangementPeriode(periode: { debut?: string; fin?: string }): void {
    this.debutActuel = periode.debut;
    this.finActuel = periode.fin;
    this.charger();
  }
}

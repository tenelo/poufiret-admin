import { Component, inject } from '@angular/core';

import { MiseAJourService } from '../../../noyau/mise-a-jour/mise-a-jour.service';

/**
 * Bandeau discret « Une nouvelle version est disponible », monté une seule fois au niveau
 * racine (voir app.html) : visible sur toutes les pages et tous les espaces (admin, partenaire,
 * livraison, et la page de connexion). Ne bloque jamais le travail en cours : ne disparaît que
 * par « Mettre à jour » ou par la croix, jamais de rechargement automatique.
 */
@Component({
  selector: 'app-bandeau-nouvelle-version',
  imports: [],
  templateUrl: './bandeau-nouvelle-version.html',
  styleUrl: './bandeau-nouvelle-version.scss',
})
export class BandeauNouvelleVersion {
  private readonly service = inject(MiseAJourService);

  readonly miseAJourDisponible = this.service.miseAJourDisponible;

  mettreAJour(): void {
    this.service.activer();
  }

  fermer(): void {
    this.service.ignorer();
  }
}

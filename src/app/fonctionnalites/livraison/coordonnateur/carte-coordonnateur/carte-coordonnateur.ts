import { Component, OnInit, inject, signal } from '@angular/core';

import { CarteLivreurs } from '../../carte-livreurs/carte-livreurs';
import { CoordonnateurLivraisonService } from '../coordonnateur-livraison.service';
import { ComptesLivraisonService } from '../comptes-livraison.service';
import { Departement } from '../../../../modeles/departement.model';

/**
 * Écran coordonnateur "Vue d'ensemble" — mince habillage autour de la carte
 * Leaflet partagée (`CarteLivreurs`), reconfigurée en mode multi-villes :
 * source de données coordonnateur + sélecteur de ville. Toute la logique
 * carte/polling reste dans le composant partagé (factorisation).
 */
@Component({
  selector: 'app-carte-coordonnateur',
  imports: [CarteLivreurs],
  templateUrl: './carte-coordonnateur.html',
  styleUrl: './carte-coordonnateur.scss',
})
export class CarteCoordonnateur implements OnInit {
  private readonly comptesService = inject(ComptesLivraisonService);

  readonly coordonnateurService = inject(CoordonnateurLivraisonService);
  readonly departements = signal<Departement[]>([]);

  ngOnInit(): void {
    this.comptesService.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => {
        // Non bloquant : sans départements, le sélecteur de ville n'affiche
        // que "Toutes les villes" et la carte reste utilisable.
      },
    });
  }
}

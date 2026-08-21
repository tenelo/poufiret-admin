import { Component, OnInit, inject, signal } from '@angular/core';

import { DispatchingGestionnaire } from '../../bureau/dispatching-gestionnaire/dispatching-gestionnaire';
import { CoordonnateurLivraisonService } from '../coordonnateur-livraison.service';
import { ComptesLivraisonService } from '../comptes-livraison.service';
import { Departement } from '../../../../modeles/departement.model';

/**
 * Écran coordonnateur "Toutes les villes" — mince habillage autour du poste
 * de dispatching partagé (`DispatchingGestionnaire`), reconfiguré en mode
 * multi-villes : source de données coordonnateur, sélecteur de ville, pas de
 * création de course. Toute la logique dispatching/assignation reste dans
 * le composant partagé (factorisation, pas de duplication).
 */
@Component({
  selector: 'app-dispatching-coordonnateur',
  imports: [DispatchingGestionnaire],
  templateUrl: './dispatching-coordonnateur.html',
  styleUrl: './dispatching-coordonnateur.scss',
})
export class DispatchingCoordonnateur implements OnInit {
  private readonly comptesService = inject(ComptesLivraisonService);

  readonly coordonnateurService = inject(CoordonnateurLivraisonService);
  readonly departements = signal<Departement[]>([]);

  ngOnInit(): void {
    this.comptesService.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => {
        // Non bloquant : sans départements, le sélecteur de ville n'affiche
        // que "Toutes les villes" et les colonnes restent utilisables.
      },
    });
  }
}

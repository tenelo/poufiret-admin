import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { OngletRechercheParametres } from './onglet-recherche-parametres/onglet-recherche-parametres';

type OngletParametres = 'recherche';

const ONGLETS_VALIDES: OngletParametres[] = ['recherche'];

/**
 * Écran admin "Paramètres" (capacité gerer_parametres) : page à onglets extensible —
 * seul l'onglet Recherche (dictionnaire) y reste, Catégories ayant son propre menu
 * (voir fonctionnalites/administration/categories/). D'autres réglages transverses
 * viendront s'y ajouter. L'onglet actif est synchronisé dans l'URL (?onglet=).
 */
@Component({
  selector: 'app-parametres',
  imports: [OngletRechercheParametres],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss',
})
export class Parametres {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly onglets: { valeur: OngletParametres; libelle: string }[] = [{ valeur: 'recherche', libelle: 'Recherche' }];

  readonly ongletActif = signal<OngletParametres>('recherche');

  constructor() {
    // Ancien lien ?onglet=categories (onglet désormais déplacé vers son propre menu) :
    // redirige directement, sans jamais afficher l'onglet Recherche par défaut.
    if (this.route.snapshot.queryParamMap.get('onglet') === 'categories') {
      void this.router.navigate(['/administration/categories']);
      return;
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const valeur = params.get('onglet');
      if (valeur === 'categories') {
        void this.router.navigate(['/administration/categories']);
        return;
      }
      if (valeur && this.estOngletValide(valeur) && valeur !== this.ongletActif()) {
        this.ongletActif.set(valeur);
      }
    });
  }

  changerOnglet(onglet: OngletParametres): void {
    this.ongletActif.set(onglet);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet },
      queryParamsHandling: 'merge',
    });
  }

  private estOngletValide(valeur: string): valeur is OngletParametres {
    return ONGLETS_VALIDES.includes(valeur as OngletParametres);
  }
}

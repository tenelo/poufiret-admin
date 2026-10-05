import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { OngletRechercheParametres } from './onglet-recherche-parametres/onglet-recherche-parametres';
import { OngletCategoriesParametres } from './onglet-categories-parametres/onglet-categories-parametres';

type OngletParametres = 'recherche' | 'categories';

const ONGLETS_VALIDES: OngletParametres[] = ['recherche', 'categories'];

/**
 * Écran admin "Paramètres" (capacité gerer_parametres) : page à onglets extensible —
 * Recherche (dictionnaire) et Catégories (ordre dans la grille) pour l'instant, d'autres
 * réglages transverses viendront s'y ajouter. L'onglet actif est synchronisé dans l'URL
 * (?onglet=) pour pouvoir le partager ou le recharger directement.
 */
@Component({
  selector: 'app-parametres',
  imports: [OngletRechercheParametres, OngletCategoriesParametres],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss',
})
export class Parametres {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly onglets: { valeur: OngletParametres; libelle: string }[] = [
    { valeur: 'recherche', libelle: 'Recherche' },
    { valeur: 'categories', libelle: 'Catégories' },
  ];

  readonly ongletActif = signal<OngletParametres>(this.ongletDepuisUrl());

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const valeur = params.get('onglet');
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

  private ongletDepuisUrl(): OngletParametres {
    const valeur = this.route.snapshot.queryParamMap.get('onglet');
    return valeur && this.estOngletValide(valeur) ? valeur : 'recherche';
  }

  private estOngletValide(valeur: string): valeur is OngletParametres {
    return ONGLETS_VALIDES.includes(valeur as OngletParametres);
  }
}

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { OngletRechercheParametres } from './onglet-recherche-parametres/onglet-recherche-parametres';
import { GestionAdmins } from '../gestion-admins/gestion-admins';
import { Geographie } from '../geographie/geographie';
import { Moderation } from '../moderation/moderation';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { NomCapacite } from '../../../modeles/permissions-admin.model';

type OngletParametres = 'admins' | 'geographie' | 'recherche' | 'moderation';

const ONGLETS_VALIDES: OngletParametres[] = ['admins', 'geographie', 'recherche', 'moderation'];

/**
 * Écran admin "Paramètres" : page à onglets — Gestion des admins, Géographie, Recherche
 * (dictionnaire), Modération de comptes —, chacun reprenant l'écran existant correspondant (sans
 * duplication) et gardant son propre droit : un onglet est masqué si l'admin n'a pas la capacité de
 * l'écran qu'il reprend (Modération reste réservée au super-admin, sans capacité fine). Catégories
 * garde son propre menu (voir fonctionnalites/administration/categories/). Onglet actif dans l'URL
 * (?onglet=) ; reçoit aussi les redirections des anciennes routes séparées (gestion-admins,
 * géographie, modération).
 */
@Component({
  selector: 'app-parametres',
  imports: [GestionAdmins, Geographie, OngletRechercheParametres, Moderation],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss',
})
export class Parametres {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissionsService = inject(PermissionsService);

  private readonly estSuperAdmin = computed(
    () => this.permissionsService.permissionsActuelles()?.isSuperuser ?? false,
  );

  private aLeDroit(capacite: NomCapacite): boolean {
    return this.estSuperAdmin() || this.permissionsService.aLaCapacite(capacite);
  }

  readonly peutVoirAdmins = computed(() => this.aLeDroit('gerer_admins'));
  readonly peutVoirGeographie = computed(() => this.aLeDroit('gerer_geographie'));
  readonly peutVoirRecherche = computed(() => this.aLeDroit('gerer_parametres'));
  readonly peutVoirModeration = computed(() => this.estSuperAdmin());

  readonly onglets = computed(() =>
    [
      { valeur: 'admins' as const, libelle: 'Gestion des admins', visible: this.peutVoirAdmins() },
      { valeur: 'geographie' as const, libelle: 'Géographie', visible: this.peutVoirGeographie() },
      { valeur: 'recherche' as const, libelle: 'Recherche', visible: this.peutVoirRecherche() },
      { valeur: 'moderation' as const, libelle: 'Modération de comptes', visible: this.peutVoirModeration() },
    ].filter((o) => o.visible),
  );

  readonly ongletActif = signal<OngletParametres>(this.ongletDepuisUrl());

  /** Si l'onglet choisi n'est plus visible (droit retiré, ou depuis l'URL), retombe sur le premier visible. */
  readonly ongletActifEffectif = computed(() => {
    const onglets = this.onglets();
    if (onglets.some((o) => o.valeur === this.ongletActif())) {
      return this.ongletActif();
    }
    return onglets[0]?.valeur ?? null;
  });

  constructor() {
    // Ancien lien ?onglet=categories (onglet désormais déplacé vers son propre menu) :
    // redirige directement, sans jamais afficher un onglet de Paramètres par défaut.
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

  private ongletDepuisUrl(): OngletParametres {
    const valeur = this.route.snapshot.queryParamMap.get('onglet');
    return valeur && this.estOngletValide(valeur) ? valeur : 'admins';
  }

  private estOngletValide(valeur: string): valeur is OngletParametres {
    return ONGLETS_VALIDES.includes(valeur as OngletParametres);
  }
}

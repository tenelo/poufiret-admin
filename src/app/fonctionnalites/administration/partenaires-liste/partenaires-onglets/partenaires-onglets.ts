import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { PartenairesListe } from '../partenaires-liste';
import { StatistiquesPartenaires } from '../statistiques-partenaires/statistiques-partenaires';
import { CreationPartenaire } from '../../creation-partenaire/creation-partenaire';
import { DemandesPartenariat } from '../../demandes-partenariat/demandes-partenariat';
import { IndicateursPartenairesComponent } from '../../indicateurs-partenaires/indicateurs-partenaires';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';
import { NomCapacite } from '../../../../modeles/permissions-admin.model';

type OngletPartenaires = 'liste' | 'statistiques' | 'nouveau' | 'demandes' | 'indicateurs';

const ONGLETS_VALIDES: OngletPartenaires[] = ['liste', 'statistiques', 'nouveau', 'demandes', 'indicateurs'];

/**
 * Page admin "Partenaires" en cinq onglets — Liste, Statistiques, Nouveau partenaire,
 * Demandes de partenariat, Indicateurs — chacun reprenant l'écran existant
 * correspondant (sans duplication) et gardant son propre droit : un onglet est masqué
 * si l'admin n'a pas la capacité de l'écran qu'il reprend. Onglet actif dans l'URL
 * (?onglet=) ; reçoit aussi les redirections des anciennes routes séparées
 * (créer-partenaire, demandes-partenariat, indicateurs-partenaires).
 */
@Component({
  selector: 'app-partenaires-onglets',
  imports: [
    PartenairesListe,
    StatistiquesPartenaires,
    CreationPartenaire,
    DemandesPartenariat,
    IndicateursPartenairesComponent,
  ],
  templateUrl: './partenaires-onglets.html',
  styleUrl: './partenaires-onglets.scss',
})
export class PartenairesOnglets {
  private readonly permissionsService = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly estSuperAdmin = computed(
    () => this.permissionsService.permissionsActuelles()?.isSuperuser ?? false,
  );

  private aLeDroit(capacite: NomCapacite): boolean {
    return this.estSuperAdmin() || this.permissionsService.aLaCapacite(capacite);
  }

  readonly peutVoirListe = computed(() => this.aLeDroit('voir_indicateurs'));
  readonly peutVoirStatistiques = computed(() => this.aLeDroit('voir_indicateurs'));
  readonly peutCreer = computed(() => this.aLeDroit('creer_partenaire'));
  readonly peutVoirDemandes = computed(() => this.aLeDroit('valider_devenir_partenaire'));
  readonly peutVoirIndicateurs = computed(() => this.aLeDroit('voir_indicateurs'));

  readonly onglets = computed(() =>
    [
      { valeur: 'liste' as const, libelle: 'Liste', visible: this.peutVoirListe() },
      { valeur: 'statistiques' as const, libelle: 'Statistiques', visible: this.peutVoirStatistiques() },
      { valeur: 'nouveau' as const, libelle: 'Nouveau partenaire', visible: this.peutCreer() },
      { valeur: 'demandes' as const, libelle: 'Demandes de partenariat', visible: this.peutVoirDemandes() },
      { valeur: 'indicateurs' as const, libelle: 'Indicateurs', visible: this.peutVoirIndicateurs() },
    ].filter((o) => o.visible),
  );

  readonly ongletActif = signal<OngletPartenaires>(this.ongletDepuisUrl());

  /** Si l'onglet choisi n'est plus visible (droit retiré, ou depuis l'URL), retombe sur le premier visible. */
  readonly ongletActifEffectif = computed(() => {
    const onglets = this.onglets();
    if (onglets.some((o) => o.valeur === this.ongletActif())) {
      return this.ongletActif();
    }
    return onglets[0]?.valeur ?? null;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const valeur = params.get('onglet');
      if (valeur && this.estOngletValide(valeur) && valeur !== this.ongletActif()) {
        this.ongletActif.set(valeur);
      }
    });
  }

  changerOnglet(onglet: OngletPartenaires): void {
    this.ongletActif.set(onglet);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet },
      queryParamsHandling: 'merge',
    });
  }

  private ongletDepuisUrl(): OngletPartenaires {
    const valeur = this.route.snapshot.queryParamMap.get('onglet');
    return valeur && this.estOngletValide(valeur) ? valeur : 'liste';
  }

  private estOngletValide(valeur: string): valeur is OngletPartenaires {
    return ONGLETS_VALIDES.includes(valeur as OngletPartenaires);
  }
}

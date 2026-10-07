import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';
import { OngletLogements } from '../onglet-logements/onglet-logements';
import { OngletDemandesLoueur } from '../onglet-demandes-loueur/onglet-demandes-loueur';
import { PREFIXE_MON_ESPACE_LOCATION, PrefixeLocation, prefixeAdminLocation } from '../location.service';

export type OngletLoueur = 'logements' | 'demandes';

const ONGLETS: { valeur: OngletLoueur; libelle: string }[] = [
  { valeur: 'logements', libelle: 'Logements' },
  { valeur: 'demandes', libelle: 'Demandes' },
];

/**
 * Hôte à onglets de l'espace loueur, utilisé à l'identique par le loueur pour ses logements
 * (préfixe "mon-espace") et par l'admin pour n'importe quel loueur (préfixe "admin/<partenaire_id>",
 * route /administration/locations/:id) — un seul jeu de composants, paramétré par le préfixe (voir
 * LocationService). Reprend exactement le pattern de EspaceRestaurant (bandeau admin, fil d'ariane,
 * onglet dans l'URL).
 */
@Component({
  selector: 'app-espace-loueur',
  imports: [RouterLink, OngletLogements, OngletDemandesLoueur],
  templateUrl: './espace-loueur.html',
  styleUrl: './espace-loueur.scss',
})
export class EspaceLoueur implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profilPartenaireContexte = inject(ProfilPartenaireContexteService);

  readonly onglets = ONGLETS;

  readonly estAdmin = signal(false);
  readonly prefixe = signal<PrefixeLocation>(PREFIXE_MON_ESPACE_LOCATION);
  readonly partenaireId = signal<number | null>(null);
  readonly nomLoueur = signal<string | null>(null);
  readonly chargementNomEnCours = signal(false);

  readonly ongletActif = signal<OngletLoueur>('logements');

  readonly libelleOngletActif = computed(
    () => this.onglets.find((o) => o.valeur === this.ongletActif())?.libelle ?? '',
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.estAdmin.set(true);
      const id = Number(idParam);
      this.partenaireId.set(id);
      this.prefixe.set(prefixeAdminLocation(id));
      const nomTransmis = (window.history.state as { nom?: string } | null)?.nom;
      this.nomLoueur.set(nomTransmis ?? null);
    } else {
      this.prefixe.set(PREFIXE_MON_ESPACE_LOCATION);
      this.chargementNomEnCours.set(true);
      this.profilPartenaireContexte.charger().subscribe({
        next: (profil) => {
          this.chargementNomEnCours.set(false);
          this.partenaireId.set(profil.id);
          this.nomLoueur.set(profil.nom_commerce);
        },
        error: () => this.chargementNomEnCours.set(false),
      });
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const onglet = params.get('onglet') as OngletLoueur | null;
      if (onglet && this.onglets.some((o) => o.valeur === onglet)) {
        this.ongletActif.set(onglet);
      }
    });

    if (!this.route.snapshot.queryParamMap.has('onglet')) {
      const ongletInitial = (this.route.snapshot.data['ongletInitial'] as OngletLoueur) ?? 'logements';
      this.changerOnglet(ongletInitial);
    }
  }

  changerOnglet(onglet: OngletLoueur): void {
    this.ongletActif.set(onglet);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

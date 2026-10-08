import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';
import { OngletLogements } from '../onglet-logements/onglet-logements';
import { OngletVehicules } from '../onglet-vehicules/onglet-vehicules';
import { OngletDemandesLoueur } from '../onglet-demandes-loueur/onglet-demandes-loueur';
import {
  LocationService,
  PREFIXE_MON_ESPACE_LOCATION,
  PrefixeLocation,
  prefixeAdminLocation,
} from '../location.service';

export type OngletLoueur = 'logements' | 'vehicules' | 'demandes';

/** Le premier onglet dépend du type de partenaire : Logements (loueur_maison) ou Véhicules (loueur_voiture). */
function ongletsPour(typePartenaire: string | null): { valeur: OngletLoueur; libelle: string }[] {
  const biens: { valeur: OngletLoueur; libelle: string } =
    typePartenaire === 'loueur_voiture'
      ? { valeur: 'vehicules', libelle: 'Véhicules' }
      : { valeur: 'logements', libelle: 'Logements' };
  return [biens, { valeur: 'demandes', libelle: 'Demandes' }];
}

/**
 * Hôte à onglets de l'espace loueur (onglet Logements pour un loueur_maison, Véhicules pour un
 * loueur_voiture), utilisé à l'identique par le loueur pour ses biens
 * (préfixe "mon-espace") et par l'admin pour n'importe quel loueur (préfixe "admin/<partenaire_id>",
 * route /administration/locations/:id) — un seul jeu de composants, paramétré par le préfixe (voir
 * LocationService). Reprend exactement le pattern de EspaceRestaurant (bandeau admin, fil d'ariane,
 * onglet dans l'URL).
 */
@Component({
  selector: 'app-espace-loueur',
  imports: [RouterLink, OngletLogements, OngletVehicules, OngletDemandesLoueur],
  templateUrl: './espace-loueur.html',
  styleUrl: './espace-loueur.scss',
})
export class EspaceLoueur implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profilPartenaireContexte = inject(ProfilPartenaireContexteService);
  private readonly locationService = inject(LocationService);

  /** loueur_maison | loueur_voiture ; null tant qu'il n'est pas connu (aucun onglet de biens affiché). */
  readonly typePartenaire = signal<string | null>(null);
  readonly onglets = computed(() => ongletsPour(this.typePartenaire()));

  readonly estAdmin = signal(false);
  readonly prefixe = signal<PrefixeLocation>(PREFIXE_MON_ESPACE_LOCATION);
  readonly partenaireId = signal<number | null>(null);
  readonly nomLoueur = signal<string | null>(null);
  readonly chargementNomEnCours = signal(false);

  readonly ongletActif = signal<OngletLoueur>('logements');

  readonly libelleOngletActif = computed(
    () => this.onglets().find((o) => o.valeur === this.ongletActif())?.libelle ?? '',
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.estAdmin.set(true);
      const id = Number(idParam);
      this.partenaireId.set(id);
      this.prefixe.set(prefixeAdminLocation(id));
      const etat = window.history.state as { nom?: string; type_partenaire?: string } | null;
      this.nomLoueur.set(etat?.nom ?? null);
      if (etat?.type_partenaire) {
        this.typePartenaire.set(etat.type_partenaire);
      } else {
        // Accès direct (URL, rechargement) : le type vient de la liste admin des loueurs.
        this.locationService.listerLoueursAdmin().subscribe({
          next: (loueurs) => {
            const loueur = loueurs.find((l) => l.id === id);
            this.typePartenaire.set(loueur?.type_partenaire ?? 'loueur_maison');
            if (loueur && !this.nomLoueur()) this.nomLoueur.set(loueur.nom);
            this.ajusterOngletBiens();
          },
          error: () => this.typePartenaire.set('loueur_maison'),
        });
      }
    } else {
      this.prefixe.set(PREFIXE_MON_ESPACE_LOCATION);
      this.chargementNomEnCours.set(true);
      this.profilPartenaireContexte.charger().subscribe({
        next: (profil) => {
          this.chargementNomEnCours.set(false);
          this.partenaireId.set(profil.id);
          this.nomLoueur.set(profil.nom_commerce);
          this.typePartenaire.set(profil.type_partenaire);
          this.ajusterOngletBiens();
        },
        error: () => this.chargementNomEnCours.set(false),
      });
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const onglet = params.get('onglet') as OngletLoueur | null;
      if (onglet && (['logements', 'vehicules', 'demandes'] as OngletLoueur[]).includes(onglet)) {
        this.ongletActif.set(onglet === 'demandes' ? onglet : (this.ongletBiensAttendu() ?? onglet));
      }
    });

    if (!this.route.snapshot.queryParamMap.has('onglet')) {
      const ongletInitial = (this.route.snapshot.data['ongletInitial'] as OngletLoueur) ?? 'logements';
      this.changerOnglet(ongletInitial);
    }
    this.ajusterOngletBiens();
  }

  /**
   * Aligne l'onglet des biens sur le type du partenaire une fois celui-ci connu (ex. ?onglet=logements
   * pour un loueur de voitures → vehicules), sans toucher à l'onglet Demandes.
   */
  private ajusterOngletBiens(): void {
    const attendu = this.ongletBiensAttendu();
    if (!attendu || this.ongletActif() === 'demandes') return;
    if (this.ongletActif() !== attendu) this.changerOnglet(attendu);
  }

  private ongletBiensAttendu(): OngletLoueur | null {
    const type = this.typePartenaire();
    if (!type) return null;
    return type === 'loueur_voiture' ? 'vehicules' : 'logements';
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

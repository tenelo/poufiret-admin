import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';
import { OngletLogements } from '../onglet-logements/onglet-logements';
import { OngletVehicules } from '../onglet-vehicules/onglet-vehicules';
import { OngletEtablissement } from '../onglet-etablissement/onglet-etablissement';
import { OngletHebergements } from '../onglet-hebergements/onglet-hebergements';
import { OngletDemandesLoueur } from '../onglet-demandes-loueur/onglet-demandes-loueur';
import {
  LocationService,
  PREFIXE_MON_ESPACE_LOCATION,
  PrefixeLocation,
  prefixeAdminLocation,
} from '../location.service';

export type OngletLoueur = 'etablissement' | 'logements' | 'vehicules' | 'hebergements' | 'demandes';

const TOUS_ONGLETS: OngletLoueur[] = ['etablissement', 'logements', 'vehicules', 'hebergements', 'demandes'];

/**
 * Onglets selon le type de partenaire : Logements (loueur_maison, et par défaut), Véhicules
 * (loueur_voiture), Établissement + Hébergements (hotelier) ; Demandes pour tous.
 */
function ongletsPour(typePartenaire: string | null): { valeur: OngletLoueur; libelle: string }[] {
  const demandes = { valeur: 'demandes' as OngletLoueur, libelle: 'Demandes' };
  switch (typePartenaire) {
    case 'loueur_voiture':
      return [{ valeur: 'vehicules', libelle: 'Véhicules' }, demandes];
    case 'hotelier':
      return [
        { valeur: 'etablissement', libelle: 'Établissement' },
        { valeur: 'hebergements', libelle: 'Hébergements' },
        demandes,
      ];
    default:
      return [{ valeur: 'logements', libelle: 'Logements' }, demandes];
  }
}

/**
 * Hôte à onglets de l'espace loueur (onglets selon le type de partenaire, voir ongletsPour),
 * utilisé à l'identique par le loueur pour ses biens
 * (préfixe "mon-espace") et par l'admin pour n'importe quel loueur (préfixe "admin/<partenaire_id>",
 * route /administration/locations/:id) — un seul jeu de composants, paramétré par le préfixe (voir
 * LocationService). Reprend exactement le pattern de EspaceRestaurant (bandeau admin, fil d'ariane,
 * onglet dans l'URL).
 */
@Component({
  selector: 'app-espace-loueur',
  imports: [
    RouterLink,
    OngletLogements,
    OngletVehicules,
    OngletEtablissement,
    OngletHebergements,
    OngletDemandesLoueur,
  ],
  templateUrl: './espace-loueur.html',
  styleUrl: './espace-loueur.scss',
})
export class EspaceLoueur implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profilPartenaireContexte = inject(ProfilPartenaireContexteService);
  private readonly locationService = inject(LocationService);

  /** loueur_maison | loueur_voiture | hotelier ; null tant qu'il n'est pas connu (aucun onglet de biens affiché). */
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
            this.ajusterOnglet();
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
          this.ajusterOnglet();
        },
        error: () => this.chargementNomEnCours.set(false),
      });
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const onglet = params.get('onglet') as OngletLoueur | null;
      if (onglet && TOUS_ONGLETS.includes(onglet)) {
        this.ongletActif.set(onglet);
        this.ajusterOnglet();
      }
    });

    if (!this.route.snapshot.queryParamMap.has('onglet')) {
      const ongletInitial = (this.route.snapshot.data['ongletInitial'] as OngletLoueur) ?? 'logements';
      this.changerOnglet(ongletInitial);
    }
    this.ajusterOnglet();
  }

  /**
   * Une fois le type du partenaire connu, ramène sur le premier onglet un onglet qui ne le concerne
   * pas (ex. ?onglet=logements pour un loueur de voitures → vehicules).
   */
  private ajusterOnglet(): void {
    if (!this.typePartenaire()) return;
    const onglets = this.onglets();
    if (!onglets.some((o) => o.valeur === this.ongletActif())) this.changerOnglet(onglets[0].valeur);
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

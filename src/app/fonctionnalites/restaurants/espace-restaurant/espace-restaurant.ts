import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';
import { OngletApercuRestaurant } from '../onglet-apercu-restaurant/onglet-apercu-restaurant';
import { OngletFicheRestaurant } from '../onglet-fiche-restaurant/onglet-fiche-restaurant';
import { OngletCarteRestaurant } from '../onglet-carte-restaurant/onglet-carte-restaurant';
import { OngletMenusRestaurant } from '../onglet-menus-restaurant/onglet-menus-restaurant';
import { OngletCommandesRestaurant } from '../onglet-commandes-restaurant/onglet-commandes-restaurant';
import { PREFIXE_MON_RESTAURANT, PrefixeRestaurant, prefixeAdmin } from '../restaurant.service';

export type OngletRestaurant = 'apercu' | 'fiche' | 'carte' | 'menus' | 'commandes';

const ONGLETS: { valeur: OngletRestaurant; libelle: string }[] = [
  { valeur: 'apercu', libelle: 'Aperçu' },
  { valeur: 'fiche', libelle: 'Fiche & horaires' },
  { valeur: 'carte', libelle: 'Carte' },
  { valeur: 'menus', libelle: 'Menus' },
  { valeur: 'commandes', libelle: 'Commandes' },
];

/**
 * Hôte à onglets de l'espace restaurant, utilisé à l'identique par le restaurateur pour son
 * restaurant (préfixe "mon-restaurant") et par l'admin pour n'importe quel restaurant (préfixe
 * "admin/<partenaire_id>", route /administration/restaurants/:id) — un seul jeu de composants,
 * paramétré par le préfixe (voir RestaurantService).
 *
 * Côté admin, l'onglet actif est reflété dans l'URL (?onglet=...) : un rechargement ou un lien
 * partagé rouvre le bon onglet. Le nom du restaurant est transmis par la liste admin (navigation
 * state) ; en accès direct par URL (lien partagé, rechargement), il n'est pas disponible — c'est
 * un repli neutre ("Restaurant"), sans second appel réseau pour le récupérer (l'API carte/fiche
 * n'expose pas le nom du restaurant lui-même).
 */
@Component({
  selector: 'app-espace-restaurant',
  imports: [
    RouterLink,
    OngletApercuRestaurant,
    OngletFicheRestaurant,
    OngletCarteRestaurant,
    OngletMenusRestaurant,
    OngletCommandesRestaurant,
  ],
  templateUrl: './espace-restaurant.html',
  styleUrl: './espace-restaurant.scss',
})
export class EspaceRestaurant implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profilPartenaireContexte = inject(ProfilPartenaireContexteService);

  readonly onglets = ONGLETS;

  readonly estAdmin = signal(false);
  readonly prefixe = signal<PrefixeRestaurant>(PREFIXE_MON_RESTAURANT);
  readonly partenaireId = signal<number | null>(null);
  readonly nomRestaurant = signal<string | null>(null);
  readonly chargementNomEnCours = signal(false);

  readonly ongletActif = signal<OngletRestaurant>('apercu');

  readonly libelleOngletActif = computed(
    () => this.onglets.find((o) => o.valeur === this.ongletActif())?.libelle ?? '',
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.estAdmin.set(true);
      const id = Number(idParam);
      this.partenaireId.set(id);
      this.prefixe.set(prefixeAdmin(id));
      // Le nom est transmis depuis la liste admin (navigation) ; repli neutre sinon.
      const nomTransmis = (window.history.state as { nom?: string } | null)?.nom;
      this.nomRestaurant.set(nomTransmis ?? null);
    } else {
      this.prefixe.set(PREFIXE_MON_RESTAURANT);
      this.chargementNomEnCours.set(true);
      // Passe par le cache partagé (déjà chargé par CoquilleApplication pour le menu latéral) :
      // évite un second appel réseau au profil.
      this.profilPartenaireContexte.charger().subscribe({
        next: (profil) => {
          this.chargementNomEnCours.set(false);
          this.partenaireId.set(profil.id);
          this.nomRestaurant.set(profil.nom_commerce);
        },
        error: () => this.chargementNomEnCours.set(false),
      });
    }

    // L'onglet actif est reflété dans ?onglet= : un lien partagé ou un retour arrière du
    // navigateur le rouvre directement, sans perdre l'onglet en cours de navigation.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const onglet = params.get('onglet') as OngletRestaurant | null;
      if (onglet && this.onglets.some((o) => o.valeur === onglet)) {
        this.ongletActif.set(onglet);
      }
    });

    // Première ouverture sans ?onglet= dans l'URL : applique l'onglet de départ propre à la route
    // (ex. "Ma carte" démarre directement sur Carte) et le reflète dans l'URL.
    if (!this.route.snapshot.queryParamMap.has('onglet')) {
      const ongletInitial = (this.route.snapshot.data['ongletInitial'] as OngletRestaurant) ?? 'apercu';
      this.changerOnglet(ongletInitial);
    }
  }

  changerOnglet(onglet: OngletRestaurant): void {
    this.ongletActif.set(onglet);
    // replaceUrl : changer d'onglet ne doit pas empiler d'entrées dans l'historique du navigateur.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

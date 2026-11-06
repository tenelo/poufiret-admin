import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProfilPartenaireContexteService } from '../../../noyau/partenaire/profil-partenaire-contexte.service';
import { OngletApercuRestaurant } from '../onglet-apercu-restaurant/onglet-apercu-restaurant';
import { OngletFicheRestaurant } from '../onglet-fiche-restaurant/onglet-fiche-restaurant';
import { OngletCarteRestaurant } from '../onglet-carte-restaurant/onglet-carte-restaurant';
import { OngletMenusRestaurant } from '../onglet-menus-restaurant/onglet-menus-restaurant';
import { OngletCommandesRestaurant } from '../onglet-commandes-restaurant/onglet-commandes-restaurant';
import { PREFIXE_MON_RESTAURANT, PrefixeRestaurant, RestaurantService, prefixeAdmin } from '../restaurant.service';
import { GabaritsService } from '../gabarits.service';
import {
  GABARIT_RESTAURANT_PAR_DEFAUT,
  Gabarit,
  gabaritCommerceParDefaut,
  gabaritDuTypePartenaire,
  pluriel,
} from '../../../modeles/gabarit.model';
import {
  FAMILLES_ETABLISSEMENTS,
  FamilleEtablissement,
  familleDuGabarit,
} from '../../administration/restaurants-liste/familles-etablissements';

export type OngletRestaurant = 'apercu' | 'fiche' | 'carte' | 'menus' | 'commandes';

const TOUS_ONGLETS: OngletRestaurant[] = ['apercu', 'fiche', 'carte', 'menus', 'commandes'];

/** Onglets selon le gabarit : libellé du catalogue tiré de la meta, Menus seulement si menus_actifs. */
function ongletsPour(gabarit: Gabarit): { valeur: OngletRestaurant; libelle: string }[] {
  return [
    { valeur: 'apercu', libelle: 'Aperçu' },
    { valeur: 'fiche', libelle: 'Fiche & horaires' },
    {
      valeur: 'carte',
      libelle: `${pluriel(gabarit.libelle_section)} & ${pluriel(gabarit.libelle_produit)}`,
    },
    ...(gabarit.menus_actifs ? [{ valeur: 'menus' as OngletRestaurant, libelle: 'Menus' }] : []),
    { valeur: 'commandes', libelle: 'Commandes' },
  ];
}

/**
 * Hôte à onglets de l'espace établissement (ex-espace restaurant), utilisé à l'identique par le
 * partenaire pour son établissement (préfixe "mon-restaurant") et par l'admin pour n'importe quel
 * établissement (préfixe "admin/<partenaire_id>", route /administration/restaurants/:id ou /administration/commerces/:id) — un
 * seul jeu de composants, paramétré par le préfixe (voir RestaurantService).
 *
 * Le gabarit de l'établissement (restaurant, boulangerie, pharmacie, mode, librairie, generique —
 * champ "gabarit" du détail GET /restaurants/<id>/) fixe les libellés et les sections via la meta
 * des gabarits (GabaritsService) ; tant qu'il n'est pas connu, l'espace se comporte comme un
 * restaurant.
 *
 * Côté admin, l'onglet actif est reflété dans l'URL (?onglet=...) : un rechargement ou un lien
 * partagé rouvre le bon onglet. Le nom de l'établissement est transmis par la liste admin
 * (navigation state) quand disponible ; sinon (accès direct par URL, lien partagé, rechargement),
 * il est rechargé via la liste admin des établissements (l'API carte/fiche n'expose pas le nom de
 * l'établissement lui-même) — affiché ensuite dans l'en-tête, le bandeau et tous les onglets.
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
  private readonly restaurantService = inject(RestaurantService);
  private readonly gabaritsService = inject(GabaritsService);

  readonly gabarit = signal<Gabarit>(GABARIT_RESTAURANT_PAR_DEFAUT);
  readonly onglets = computed(() => ongletsPour(this.gabarit()));

  readonly estAdmin = signal(false);
  readonly prefixe = signal<PrefixeRestaurant>(PREFIXE_MON_RESTAURANT);
  readonly partenaireId = signal<number | null>(null);
  readonly nomRestaurant = signal<string | null>(null);
  readonly chargementNomEnCours = signal(false);

  readonly ongletActif = signal<OngletRestaurant>('apercu');

  /** Admin : liste de retour (fil d'Ariane, « ← … ») selon le gabarit du partenaire —
   *  « Restaurants » ou « Commerces ». Valeur provisoire tirée de la route, corrigée dès que
   *  le gabarit est connu (un commerce ouvert par /administration/restaurants/<id> ramène
   *  quand même vers Commerces). */
  readonly familleRetour = signal<FamilleEtablissement>('restaurants');
  readonly listeRetour = computed(() => FAMILLES_ETABLISSEMENTS[this.familleRetour()]);

  readonly libelleOngletActif = computed(
    () => this.onglets().find((o) => o.valeur === this.ongletActif())?.libelle ?? '',
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.estAdmin.set(true);
      const id = Number(idParam);
      this.partenaireId.set(id);
      this.prefixe.set(prefixeAdmin(id));
      const famille = this.route.snapshot.data['famille'] === 'commerces' ? 'commerces' : 'restaurants';
      this.familleRetour.set(famille);
      // Commerce ouvert depuis « Commerces » : pas de menus affichés même avant la meta.
      if (famille === 'commerces') this.gabarit.set(gabaritCommerceParDefaut('generique'));

      // Le nom est transmis depuis la liste admin (navigation) ; sinon (accès direct par URL,
      // lien partagé, rechargement de page) on le recharge depuis la liste admin des établissements.
      const nomTransmis = (window.history.state as { nom?: string } | null)?.nom;
      if (nomTransmis) this.nomRestaurant.set(nomTransmis);
      else this.chargementNomEnCours.set(true);

      // Gabarit : détail GET /restaurants/<id>/, sinon la ligne de la liste admin (qui donne aussi
      // le nom en accès direct).
      const ligneAdmin$ = this.restaurantService.listerRestaurantsAdmin().pipe(
        map((etablissements) => etablissements.find((e) => e.id === id) ?? null),
        catchError(() => of(null)),
        shareReplay(1),
      );
      ligneAdmin$.subscribe((ligne) => {
        this.chargementNomEnCours.set(false);
        if (!this.nomRestaurant()) this.nomRestaurant.set(ligne?.nom ?? null);
      });
      this.chargerGabarit(id, ligneAdmin$.pipe(map((ligne) => ligne?.gabarit ?? null)));
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
          const codeDuType = gabaritDuTypePartenaire(profil.type_partenaire);
          // Commerce reconnu à son type : pas de menus affichés même avant la meta.
          if (codeDuType && codeDuType !== 'restaurant') this.gabarit.set(gabaritCommerceParDefaut(codeDuType));
          this.chargerGabarit(profil.id, of(codeDuType));
        },
        error: () => this.chargementNomEnCours.set(false),
      });
    }

    // L'onglet actif est reflété dans ?onglet= : un lien partagé ou un retour arrière du
    // navigateur le rouvre directement, sans perdre l'onglet en cours de navigation.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const onglet = params.get('onglet') as OngletRestaurant | null;
      if (onglet && TOUS_ONGLETS.includes(onglet)) {
        this.ongletActif.set(onglet);
        this.ramenerSurOngletValide();
      }
    });

    // Première ouverture sans ?onglet= dans l'URL : applique l'onglet de départ propre à la route
    // (ex. "Ma carte" démarre directement sur Carte) et le reflète dans l'URL.
    if (!this.route.snapshot.queryParamMap.has('onglet')) {
      const ongletInitial = (this.route.snapshot.data['ongletInitial'] as OngletRestaurant) ?? 'apercu';
      this.changerOnglet(ongletInitial);
    }
  }

  /**
   * Gabarit de l'établissement puis sa meta : champ "gabarit" du détail GET /restaurants/<id>/,
   * sinon `repli$` (ligne de la liste admin, ou type du partenaire). Fixe aussi la liste de retour
   * admin (Restaurants / Commerces). Sans aucune source : restaurant (rien de bloquant).
   */
  private chargerGabarit(partenaireId: number, repli$: Observable<string | null>): void {
    this.restaurantService
      .obtenirGabaritEtablissement(partenaireId)
      .pipe(
        catchError(() => of(null)),
        switchMap((code) => (code ? of(code) : repli$)),
        switchMap((code) => {
          if (this.estAdmin() && code) this.familleRetour.set(familleDuGabarit(code));
          // Aucune source : un commerce ouvert depuis « Commerces » reste un commerce (sans menus).
          const codeEffectif = code ?? (this.familleRetour() === 'commerces' ? 'generique' : null);
          return this.gabaritsService.gabarit(codeEffectif);
        }),
      )
      .subscribe({
        next: (gabarit) => {
          this.gabarit.set(gabarit);
          this.ramenerSurOngletValide();
        },
        error: () => undefined,
      });
  }

  /** Ex. ?onglet=menus pour un établissement sans menus : retour à l'Aperçu. */
  private ramenerSurOngletValide(): void {
    if (!this.onglets().some((o) => o.valeur === this.ongletActif())) this.changerOnglet('apercu');
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

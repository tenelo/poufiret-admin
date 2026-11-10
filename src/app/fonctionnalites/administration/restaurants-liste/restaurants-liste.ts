import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { RestaurantService } from '../../restaurants/restaurant.service';
import { RestaurantsListeEtatService } from './restaurants-liste-etat.service';
import { PartenaireVisibiliteService } from '../partenaire-visibilite.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { RestaurantAdminListe } from '../../../modeles/restaurant-admin-liste.model';
import { GabaritsService, resoudreGabarit } from '../../restaurants/gabarits.service';
import { Gabarit, LIBELLES_GABARIT } from '../../../modeles/gabarit.model';
import { FAMILLES_ETABLISSEMENTS, FamilleEtablissement } from './familles-etablissements';

/**
 * Liste admin des établissements (capacité gerer_restaurants), servie sous deux routes :
 * « Restaurants » (gabarit restaurant, filtre de gabarit masqué) et « Commerces » (boulangerie,
 * pharmacie, librairie, mode) — famille lue dans les data de la route (familles-etablissements.ts).
 * Indicateurs : ouvert/fermé, fiche à compléter ou non, menu du jour publié ou non (gabarits avec
 * menus seulement), commandes du jour. Recherche et filtre par département
 * entièrement côté client (GET /restaurants/admin/ renvoie la liste complète, sans pagination ni
 * recherche serveur). Clic sur un établissement : l'espace établissement en tant qu'admin
 * (préfixe admin/<id>). La recherche et le département filtré sont conservés dans
 * RestaurantsListeEtatService pour réapparaître tels quels au retour depuis cet espace.
 */
@Component({
  selector: 'app-restaurants-liste',
  imports: [],
  templateUrl: './restaurants-liste.html',
  styleUrl: './restaurants-liste.scss',
})
export class RestaurantsListe implements OnInit {
  private readonly service = inject(RestaurantService);
  private readonly visibiliteService = inject(PartenaireVisibiliteService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gabaritsService = inject(GabaritsService);

  // ---- Actif / inactif, suppression douce, restauration (apps.administration.views_visibilite) ----
  /** '' = tous (hors supprimés), '1' = actifs, '0' = inactifs. */
  readonly filtreVisible = signal<'' | '1' | '0'>('');
  readonly afficherSupprimes = signal(false);
  readonly messageSucces = signal<string | null>(null);
  readonly visibiliteEnCoursId = signal<number | null>(null);
  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly restaurationEnCoursId = signal<number | null>(null);
  readonly restaurantAConfirmerSuppression = signal<RestaurantAdminListe | null>(null);

  readonly peutMasquer = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('masquer_partenaire'),
  );
  readonly peutSupprimer = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('supprimer_soft_partenaire'),
  );
  readonly peutRestaurer = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('restaurer_partenaire'),
  );

  readonly famille: FamilleEtablissement =
    this.route.snapshot.data['famille'] === 'commerces' ? 'commerces' : 'restaurants';
  readonly definition = FAMILLES_ETABLISSEMENTS[this.famille];
  private readonly etat = inject(RestaurantsListeEtatService).pour(this.famille);

  readonly optionsGabarit = this.definition.optionsGabarit;
  readonly gabarits = signal<Record<string, Gabarit>>({});

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  /** Établissements de la famille de la liste (le reste n'y apparaît jamais). */
  readonly restaurants = signal<RestaurantAdminListe[]>([]);

  readonly recherche = this.etat.recherche;
  readonly departementFiltre = this.etat.departementFiltre;
  readonly gabaritFiltre = this.etat.gabaritFiltre;

  /** Départements présents dans la liste, pour peupler le filtre (pas d'endpoint dédié ici). */
  readonly departements = computed(() =>
    [...new Set(this.restaurants().map((r) => r.departement_nom).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  readonly restaurantsFiltres = computed(() => {
    const texte = this.recherche().trim().toLowerCase();
    const departement = this.departementFiltre();
    const gabarit = this.gabaritFiltre();
    return this.restaurants().filter((r) => {
      if (gabarit && (r.gabarit ?? 'restaurant') !== gabarit) return false;
      if (departement && r.departement_nom !== departement) return false;
      if (!texte) return true;
      return r.nom.toLowerCase().includes(texte) || r.departement_nom?.toLowerCase().includes(texte);
    });
  });

  ngOnInit(): void {
    this.charger();
    this.gabaritsService.lister().subscribe((gabarits) => this.gabarits.set(gabarits));
  }

  /** Libellé du gabarit d'une ligne (meta, sinon repli : « Élevage »…), « Restaurant » par défaut. */
  libelleGabarit(r: RestaurantAdminListe): string {
    const code = r.gabarit ?? 'restaurant';
    return this.gabarits()[code]?.libelle ?? LIBELLES_GABARIT[code] ?? code;
  }

  /** Indicateur « menu du jour » seulement pour les gabarits avec menus (restaurant par défaut). */
  aDesMenus(r: RestaurantAdminListe): boolean {
    const code = r.gabarit ?? 'restaurant';
    return resoudreGabarit(this.gabarits(), code).menus_actifs;
  }

  changerGabarit(valeur: string): void {
    this.gabaritFiltre.set(valeur);
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service
      .listerRestaurantsAdmin(this.filtreVisible() || undefined, this.afficherSupprimes())
      .pipe(finalize(() => this.chargementEnCours.set(false)))
      .subscribe({
        next: (restaurants) =>
          this.restaurants.set(
            restaurants.filter((r) => this.definition.gabarits.includes(r.gabarit ?? 'restaurant')),
          ),
        error: (erreur: unknown) => this.erreurChargement.set(extraireMessageErreur(erreur)),
      });
  }

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  changerDepartement(valeur: string): void {
    this.departementFiltre.set(valeur);
  }

  changerFiltreVisible(valeur: string): void {
    this.filtreVisible.set(valeur as '' | '1' | '0');
    this.charger();
  }

  changerAfficherSupprimes(valeur: boolean): void {
    this.afficherSupprimes.set(valeur);
    this.charger();
  }

  ouvrir(restaurant: RestaurantAdminListe): void {
    this.router.navigate([this.definition.lien, restaurant.id], {
      state: { nom: restaurant.nom },
    });
  }

  // ---- Actif / inactif (bascule immédiate) ----

  /** Clic sur la case « Actif » : bascule immédiate, pas de formulaire ni de confirmation.
   *  En cas d'erreur, la liste n'est pas modifiée : la case revient donc à sa position. */
  basculerVisibilite(restaurant: RestaurantAdminListe): void {
    if (this.visibiliteEnCoursId()) return;
    this.visibiliteEnCoursId.set(restaurant.id);
    this.erreurChargement.set(null);
    this.messageSucces.set(null);

    this.visibiliteService.changerVisibilite(restaurant.id, !restaurant.est_visible).subscribe({
      next: (etat) => {
        this.visibiliteEnCoursId.set(null);
        this.remplacer(restaurant.id, etat.est_visible, restaurant.est_supprime);
        this.messageSucces.set(
          etat.est_visible ? `« ${restaurant.nom} » est maintenant actif.` : `« ${restaurant.nom} » est maintenant inactif.`,
        );
      },
      error: (erreur: unknown) => {
        this.visibiliteEnCoursId.set(null);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Suppression douce (confirmation) / restauration ----

  demanderSuppression(restaurant: RestaurantAdminListe): void {
    this.messageSucces.set(null);
    this.restaurantAConfirmerSuppression.set(restaurant);
  }

  annulerSuppression(): void {
    if (this.suppressionEnCoursId()) return;
    this.restaurantAConfirmerSuppression.set(null);
  }

  confirmerSuppression(): void {
    const restaurant = this.restaurantAConfirmerSuppression();
    if (!restaurant || this.suppressionEnCoursId()) return;
    this.suppressionEnCoursId.set(restaurant.id);

    this.visibiliteService.supprimer(restaurant.id).subscribe({
      next: (etat) => {
        this.suppressionEnCoursId.set(null);
        this.restaurantAConfirmerSuppression.set(null);
        this.remplacer(restaurant.id, etat.est_visible, etat.est_supprime);
        this.messageSucces.set(`« ${restaurant.nom} » a été supprimé (récupérable via « Afficher les supprimés »).`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCoursId.set(null);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  restaurer(restaurant: RestaurantAdminListe): void {
    if (this.restaurationEnCoursId()) return;
    this.restaurationEnCoursId.set(restaurant.id);
    this.messageSucces.set(null);

    this.visibiliteService.restaurer(restaurant.id).subscribe({
      next: (etat) => {
        this.restaurationEnCoursId.set(null);
        if (this.afficherSupprimes()) {
          this.charger();
        } else {
          this.remplacer(restaurant.id, etat.est_visible, etat.est_supprime);
        }
        this.messageSucces.set(`« ${restaurant.nom} » a été restauré.`);
      },
      error: (erreur: unknown) => {
        this.restaurationEnCoursId.set(null);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private remplacer(id: number, estVisible: boolean, estSupprime: boolean): void {
    this.restaurants.update((liste) =>
      liste.map((r) => (r.id === id ? { ...r, est_visible: estVisible, est_supprime: estSupprime } : r)),
    );
  }
}

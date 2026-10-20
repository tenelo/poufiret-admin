import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { RestaurantService } from '../../restaurants/restaurant.service';
import { RestaurantsListeEtatService } from './restaurants-liste-etat.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { RestaurantAdminListe } from '../../../modeles/restaurant-admin-liste.model';
import { GabaritsService } from '../../restaurants/gabarits.service';
import { Gabarit, OPTIONS_FILTRE_GABARIT } from '../../../modeles/gabarit.model';

/**
 * Liste admin des établissements (ex-restaurants, capacité gerer_restaurants), filtrable par
 * gabarit : ouvert/fermé, fiche à compléter ou non, menu du jour publié ou non (gabarits avec
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
  private readonly router = inject(Router);
  private readonly etat = inject(RestaurantsListeEtatService);
  private readonly gabaritsService = inject(GabaritsService);

  readonly optionsGabarit = OPTIONS_FILTRE_GABARIT;
  readonly gabarits = signal<Record<string, Gabarit>>({});

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
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

  /** Libellé du gabarit d'une ligne (meta), « Restaurant » par défaut. */
  libelleGabarit(r: RestaurantAdminListe): string {
    const code = r.gabarit ?? 'restaurant';
    return this.gabarits()[code]?.libelle ?? (code === 'restaurant' ? 'Restaurant' : code);
  }

  /** Indicateur « menu du jour » seulement pour les gabarits avec menus (restaurant par défaut). */
  aDesMenus(r: RestaurantAdminListe): boolean {
    const code = r.gabarit ?? 'restaurant';
    return this.gabarits()[code]?.menus_actifs ?? code === 'restaurant';
  }

  changerGabarit(valeur: string): void {
    this.gabaritFiltre.set(valeur);
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service
      .listerRestaurantsAdmin()
      .pipe(finalize(() => this.chargementEnCours.set(false)))
      .subscribe({
        next: (restaurants) => this.restaurants.set(restaurants),
        error: (erreur: unknown) => this.erreurChargement.set(extraireMessageErreur(erreur)),
      });
  }

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  changerDepartement(valeur: string): void {
    this.departementFiltre.set(valeur);
  }

  ouvrir(restaurant: RestaurantAdminListe): void {
    this.router.navigate(['/administration/etablissements', restaurant.id], {
      state: { nom: restaurant.nom },
    });
  }
}

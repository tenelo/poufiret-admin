import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { LocationService } from '../../locations/location.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { LoueurAdminListe } from '../../../modeles/logement.model';

/** Métier déduit de type_partenaire + type_etablissement, pour les pastilles du haut (?metier=). */
export type MetierLoueur = 'hotels' | 'residences' | 'maisons' | 'voitures';

const OPTIONS_METIER: { valeur: MetierLoueur; libelle: string; icone: string }[] = [
  { valeur: 'hotels', libelle: 'Hôtels', icone: '🏨' },
  { valeur: 'residences', libelle: 'Résidences meublées', icone: '🛋️' },
  { valeur: 'maisons', libelle: 'Maisons à louer', icone: '🏠' },
  { valeur: 'voitures', libelle: 'Location auto', icone: '🚗' },
];

/** Hôtelier + residence_meublee = Résidences meublées ; hôtelier + tout le reste (hotel, autre, null) = Hôtels. */
function metierDe(loueur: LoueurAdminListe): MetierLoueur {
  if (loueur.type_partenaire === 'loueur_maison') return 'maisons';
  if (loueur.type_partenaire === 'loueur_voiture') return 'voitures';
  return loueur.type_etablissement === 'residence_meublee' ? 'residences' : 'hotels';
}

/**
 * Liste admin des loueurs (capacité gerer_locations), maisons, véhicules et hôtels (badge par
 * carte) : indicateurs biens disponibles / réservés / loués, à vendre / vendus (apps.locations.vente,
 * masqués si à 0) et demandes en attente (alerte si > 0).
 * En haut, pastilles « Toutes / Hôtels / Résidences meublées / Maisons à louer / Location auto »
 * (même style que les catégories du centre des commandes), ?metier= dans l'URL, compteurs tenant
 * compte de la recherche et du département ; une pastille sans loueur est masquée. Recherche
 * entièrement côté client (GET /locations/admin/ renvoie la liste complète). Clic sur un loueur :
 * l'espace loueur en tant qu'admin (préfixe admin/<id>), même pattern que RestaurantsListe.
 */
@Component({
  selector: 'app-loueurs-liste',
  imports: [],
  templateUrl: './loueurs-liste.html',
  styleUrl: './loueurs-liste.scss',
})
export class LoueursListe implements OnInit {
  private readonly service = inject(LocationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly loueurs = signal<LoueurAdminListe[]>([]);

  readonly recherche = signal('');

  readonly departements = computed(() =>
    [...new Set(this.loueurs().map((l) => l.departement_nom).filter((d): d is string => !!d))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  readonly departementFiltre = signal('');

  readonly optionsMetier = OPTIONS_METIER;
  /** '' = pastille « Toutes ». */
  readonly metierFiltre = signal<MetierLoueur | ''>('');

  /** Recherche + département appliqués, avant la pastille métier : base des compteurs des pastilles. */
  private readonly loueursAvantMetier = computed(() => {
    const texte = this.recherche().trim().toLowerCase();
    const departement = this.departementFiltre();
    return this.loueurs().filter((l) => {
      if (departement && l.departement_nom !== departement) return false;
      if (!texte) return true;
      return l.nom.toLowerCase().includes(texte) || (l.departement_nom?.toLowerCase().includes(texte) ?? false);
    });
  });

  /** Compteur de chaque pastille, sur la liste déjà filtrée par recherche/département. */
  readonly comptesMetier = computed(() => {
    const comptes: Record<MetierLoueur, number> = { hotels: 0, residences: 0, maisons: 0, voitures: 0 };
    for (const loueur of this.loueursAvantMetier()) {
      comptes[metierDe(loueur)]++;
    }
    return comptes;
  });

  /** Pastilles à afficher : « Toutes » toujours visible, les autres seulement si au moins un loueur. */
  readonly optionsMetierVisibles = computed(() => this.optionsMetier.filter((o) => this.comptesMetier()[o.valeur] > 0));

  readonly loueursFiltres = computed(() => {
    const metier = this.metierFiltre();
    return this.loueursAvantMetier().filter((l) => !metier || metierDe(l) === metier);
  });

  ngOnInit(): void {
    const metierParam = this.route.snapshot.queryParamMap.get('metier');
    if (metierParam && this.optionsMetier.some((o) => o.valeur === metierParam)) {
      this.metierFiltre.set(metierParam as MetierLoueur);
    }
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerLoueursAdmin().subscribe({
      next: (loueurs) => {
        this.chargementEnCours.set(false);
        this.loueurs.set(loueurs);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  changerDepartement(valeur: string): void {
    this.departementFiltre.set(valeur);
  }

  /** Pastille cliquée : filtre la liste et reflète le choix dans ?metier=. */
  choisirMetier(metier: MetierLoueur | ''): void {
    if (this.metierFiltre() === metier) return;
    this.metierFiltre.set(metier);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { metier: metier || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Badge de la carte : reflète le métier, comme les pastilles du haut. */
  libelleType(loueur: LoueurAdminListe): string {
    switch (metierDe(loueur)) {
      case 'maisons':
        return 'Maison';
      case 'voitures':
        return 'Véhicules';
      case 'residences':
        return loueur.type_etablissement_libelle || 'Résidence meublée';
      case 'hotels':
        return 'Hôtel';
    }
  }

  ouvrir(loueur: LoueurAdminListe): void {
    this.router.navigate(['/administration/locations', loueur.id], {
      state: { nom: loueur.nom, type_partenaire: loueur.type_partenaire },
    });
  }
}

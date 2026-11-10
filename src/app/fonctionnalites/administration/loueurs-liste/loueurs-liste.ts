import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { LocationService } from '../../locations/location.service';
import { PartenaireVisibiliteService } from '../partenaire-visibilite.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
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
  private readonly visibiliteService = inject(PartenaireVisibiliteService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly loueurs = signal<LoueurAdminListe[]>([]);

  readonly recherche = signal('');

  // ---- Actif / inactif, suppression douce, restauration (apps.administration.views_visibilite) ----
  /** '' = tous (hors supprimés), '1' = actifs, '0' = inactifs. */
  readonly filtreVisible = signal<'' | '1' | '0'>('');
  readonly afficherSupprimes = signal(false);
  readonly messageSucces = signal<string | null>(null);
  readonly visibiliteEnCoursId = signal<number | null>(null);
  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly restaurationEnCoursId = signal<number | null>(null);
  readonly loueurAConfirmerSuppression = signal<LoueurAdminListe | null>(null);

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

    this.service.listerLoueursAdmin(this.filtreVisible() || undefined, this.afficherSupprimes()).subscribe({
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

  changerFiltreVisible(valeur: string): void {
    this.filtreVisible.set(valeur as '' | '1' | '0');
    this.charger();
  }

  changerAfficherSupprimes(valeur: boolean): void {
    this.afficherSupprimes.set(valeur);
    this.charger();
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

  // ---- Actif / inactif (bascule immédiate) ----

  /** Clic sur la case « Actif » : bascule immédiate, pas de formulaire ni de confirmation.
   *  En cas d'erreur, la liste n'est pas modifiée : la case revient donc à sa position. */
  basculerVisibilite(loueur: LoueurAdminListe): void {
    if (this.visibiliteEnCoursId()) return;
    this.visibiliteEnCoursId.set(loueur.id);
    this.erreurChargement.set(null);
    this.messageSucces.set(null);

    this.visibiliteService.changerVisibilite(loueur.id, !loueur.est_visible).subscribe({
      next: (etat) => {
        this.visibiliteEnCoursId.set(null);
        this.remplacer(loueur.id, etat.est_visible, loueur.est_supprime);
        this.messageSucces.set(etat.est_visible ? `« ${loueur.nom} » est maintenant actif.` : `« ${loueur.nom} » est maintenant inactif.`);
      },
      error: (erreur: unknown) => {
        this.visibiliteEnCoursId.set(null);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Suppression douce (confirmation) / restauration ----

  demanderSuppression(loueur: LoueurAdminListe): void {
    this.messageSucces.set(null);
    this.loueurAConfirmerSuppression.set(loueur);
  }

  annulerSuppression(): void {
    if (this.suppressionEnCoursId()) return;
    this.loueurAConfirmerSuppression.set(null);
  }

  confirmerSuppression(): void {
    const loueur = this.loueurAConfirmerSuppression();
    if (!loueur || this.suppressionEnCoursId()) return;
    this.suppressionEnCoursId.set(loueur.id);

    this.visibiliteService.supprimer(loueur.id).subscribe({
      next: (etat) => {
        this.suppressionEnCoursId.set(null);
        this.loueurAConfirmerSuppression.set(null);
        this.remplacer(loueur.id, etat.est_visible, etat.est_supprime);
        this.messageSucces.set(`« ${loueur.nom} » a été supprimé (récupérable via « Afficher les supprimés »).`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCoursId.set(null);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  restaurer(loueur: LoueurAdminListe): void {
    if (this.restaurationEnCoursId()) return;
    this.restaurationEnCoursId.set(loueur.id);
    this.messageSucces.set(null);

    this.visibiliteService.restaurer(loueur.id).subscribe({
      next: (etat) => {
        this.restaurationEnCoursId.set(null);
        if (this.afficherSupprimes()) {
          // La corbeille (?supprimes=1) ne doit plus le contenir : on recharge.
          this.charger();
        } else {
          this.remplacer(loueur.id, etat.est_visible, etat.est_supprime);
        }
        this.messageSucces.set(`« ${loueur.nom} » a été restauré.`);
      },
      error: (erreur: unknown) => {
        this.restaurationEnCoursId.set(null);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private remplacer(id: number, estVisible: boolean, estSupprime: boolean): void {
    this.loueurs.update((liste) =>
      liste.map((l) => (l.id === id ? { ...l, est_visible: estVisible, est_supprime: estSupprime } : l)),
    );
  }
}

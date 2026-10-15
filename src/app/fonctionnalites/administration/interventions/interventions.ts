import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import { InterventionsService } from './interventions.service';
import { DetailIntervention } from './detail-intervention/detail-intervention';
import { FiltresInterventions } from './filtres-interventions/filtres-interventions';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { formaterDateHeure } from '../commandes-admin/formater-commande';
import {
  CompteursStatutInterventions,
  FILTRES_INTERVENTIONS_DEFAUT,
  FiltresInterventionsAdmin,
  InterventionAdmin,
  MetaInterventions,
  ONGLET_TOUTES_INTERVENTIONS,
} from '../../../modeles/intervention-admin.model';

const TAILLE_PAGE = 20;

/**
 * Centre des demandes d'intervention (admin / super-admin, capacité voir_interventions OU
 * gerer_interventions) : onglet « Toutes » + un onglet par statut connu du backend (meta), filtres
 * (recherche, urgence, type, artisan, période), liste, détail en panneau latéral et export CSV.
 * Même pattern que le centre des commandes (sans tableau de bord graphique). Compteurs d'onglets
 * optionnels (compteurs_statut) : absents → pas de badge, sans erreur. Statuts/urgences/
 * types/libellés viennent tous du backend. Actions
 * (transitions, assignation d'un artisan, notes) visibles uniquement avec gerer_interventions,
 * sinon écran en lecture seule (voir DetailIntervention.peutGerer). `?intervention=<id>` ouvre
 * directement le détail (et l'onglet de son statut).
 */
@Component({
  selector: 'app-interventions',
  imports: [FiltresInterventions, DetailIntervention],
  templateUrl: './interventions.html',
  styleUrl: './interventions.scss',
})
export class Interventions implements OnInit {
  private readonly service = inject(InterventionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly taillePage = TAILLE_PAGE;
  readonly formaterDateHeure = formaterDateHeure;

  readonly meta = signal<MetaInterventions | null>(null);
  readonly onglet = signal<string>(ONGLET_TOUTES_INTERVENTIONS);
  readonly pret = signal(false);
  readonly filtres = signal<FiltresInterventionsAdmin>(FILTRES_INTERVENTIONS_DEFAUT);
  readonly compteursStatut = signal<CompteursStatutInterventions | null>(null);

  readonly interventions = signal<InterventionAdmin[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly chargementListe = signal(false);
  readonly erreurListe = signal<string | null>(null);

  readonly interventionOuverteId = signal<number | null>(null);

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / TAILLE_PAGE)));

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  /** Onglets : « Toutes » + un par statut de meta, dans l'ordre reçu. */
  readonly onglets = computed(() => [
    { valeur: ONGLET_TOUTES_INTERVENTIONS, libelle: 'Toutes' },
    ...(this.meta()?.statuts ?? []).map((s) => ({ valeur: s.valeur, libelle: s.libelle })),
  ]);

  private demarre = false;
  private abonnementListe?: Subscription;

  ngOnInit(): void {
    this.service.meta().subscribe({
      next: (meta) => this.meta.set(meta),
      // Sans meta, les filtres urgence/type n'ont pas d'options, le reste fonctionne.
      error: () => undefined,
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('intervention'));
      if (id > 0) {
        this.ouvrirDepuisLien(id);
      } else if (!this.demarre) {
        this.initialiser();
      }
    });
  }

  // ---- Démarrage ----

  private initialiser(): void {
    this.demarre = true;
    this.pret.set(true);
    this.chargerListe();
  }

  /** Lien direct ?intervention=<id> : ouvre le détail et l'onglet de son statut. */
  private ouvrirDepuisLien(id: number): void {
    this.demarre = true;
    this.service.detail(id).subscribe({
      next: (detail) => {
        this.onglet.set(detail.statut);
        this.filtres.update((f) => ({ ...f, statut: '' }));
        this.page.set(1);
        this.interventionOuverteId.set(id);
        this.pret.set(true);
        this.chargerListe();
      },
      error: (erreur: unknown) => {
        this.erreurListe.set(extraireMessageErreur(erreur));
        this.interventionOuverteId.set(id);
        if (!this.pret()) {
          this.onglet.set(ONGLET_TOUTES_INTERVENTIONS);
          this.pret.set(true);
          this.chargerListe();
        }
      },
    });
  }

  // ---- Chargement ----

  private statutCourant(): string | null {
    return this.onglet() === ONGLET_TOUTES_INTERVENTIONS ? null : this.onglet();
  }

  chargerListe(silencieux = false): void {
    // Désabonne l'appel précédent AVANT de (re)poser le drapeau de chargement : sinon le
    // finalize() de l'ancien appel (déclenché par unsubscribe) écraserait aussitôt le nouveau.
    this.abonnementListe?.unsubscribe();
    if (!silencieux) {
      this.chargementListe.set(true);
    }
    this.erreurListe.set(null);

    const filtresAvecOnglet: FiltresInterventionsAdmin = { ...this.filtres(), statut: this.statutCourant() ?? '' };

    this.abonnementListe = this.service
      .lister(filtresAvecOnglet, this.page(), TAILLE_PAGE)
      .pipe(finalize(() => this.chargementListe.set(false)))
      .subscribe({
        next: (reponse) => {
          this.interventions.set(reponse.resultats);
          this.total.set(reponse.total);
          // Optionnel côté backend : absent → compteursStatut reste null, voir compteur().
          this.compteursStatut.set(reponse.compteurs_statut ?? null);
        },
        error: (erreur: unknown) => {
          this.erreurListe.set(extraireMessageErreur(erreur));
        },
      });
  }

  /** Badge d'un onglet : clé `total` pour « Toutes », sinon son propre statut. Null si non fourni. */
  compteur(onglet: string): number | null {
    const compteurs = this.compteursStatut();
    if (!compteurs) return null;
    const cle = onglet === ONGLET_TOUTES_INTERVENTIONS ? 'total' : onglet;
    return compteurs[cle] ?? null;
  }

  // ---- Interactions ----

  rafraichir(): void {
    this.chargerListe();
  }

  changerOnglet(onglet: string): void {
    if (onglet === this.onglet()) return;
    this.onglet.set(onglet);
    this.page.set(1);
    this.chargerListe();
  }

  surFiltres(filtres: FiltresInterventionsAdmin): void {
    this.filtres.set(filtres);
    this.page.set(1);
    this.chargerListe();
  }

  changerPage(page: number): void {
    this.page.set(page);
    this.chargerListe();
  }

  ouvrirDetail(id: number): void {
    this.interventionOuverteId.set(id);
  }

  fermerDetail(): void {
    this.interventionOuverteId.set(null);
    if (this.route.snapshot.queryParamMap.has('intervention')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { intervention: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /** Après une action dans le détail : la liste se recharge silencieusement. */
  surDetailModifie(): void {
    this.chargerListe(true);
  }

  exporter(): void {
    if (this.exportEnCours()) return;
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    const filtresAvecOnglet: FiltresInterventionsAdmin = { ...this.filtres(), statut: this.statutCourant() ?? '' };
    this.service.exporterCsv(filtresAvecOnglet).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }
}

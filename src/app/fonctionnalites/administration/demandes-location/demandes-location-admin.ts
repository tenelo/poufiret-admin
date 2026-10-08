import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DemandesLocationService } from '../../locations/demandes-location.service';
import { DetailDemandeLocation } from './detail-demande-location/detail-demande-location';
import { FiltresDemandesLocation } from './filtres-demandes-location/filtres-demandes-location';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { formaterDateHeure } from '../commandes-admin/formater-commande';
import { formaterFrancs, libelleTypeBien } from '../../locations/formater-location';
import {
  CompteursGroupeDemandes,
  DemandeLocation,
  FILTRES_DEMANDES_DEFAUT,
  FiltresDemandesAdmin,
  MetaDemandes,
  ONGLETS_DEMANDES,
  OngletDemandes,
} from '../../../modeles/reservation.model';

const TAILLE_PAGE = 20;

/**
 * Centre de gestion des demandes de location (admin / super-admin, capacité gerer_reservations) :
 * onglets À traiter | En cours | Terminées | Annulées | Toutes avec compteurs, filtres communs,
 * liste, détail en panneau latéral et export CSV. Même pattern que CommandesAdmin (sans tableau de
 * bord graphique, non demandé ici). `partenaireFixe` : utilisé en intégré dans l'onglet Demandes de
 * l'espace loueur (admin) — filtre verrouillé sur ce loueur, champ loueur masqué.
 * `?demande=<id>` ouvre directement le détail (et l'onglet du groupe correspondant).
 */
@Component({
  selector: 'app-demandes-location-admin',
  imports: [FiltresDemandesLocation, DetailDemandeLocation],
  templateUrl: './demandes-location-admin.html',
  styleUrl: './demandes-location-admin.scss',
})
export class DemandesLocationAdmin implements OnInit {
  private readonly service = inject(DemandesLocationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly partenaireFixe = input<{ id: number; nom: string } | null>(null);

  readonly onglets = ONGLETS_DEMANDES;
  readonly taillePage = TAILLE_PAGE;
  readonly formaterDateHeure = formaterDateHeure;
  readonly formaterFrancs = formaterFrancs;
  readonly libelleTypeBien = libelleTypeBien;

  readonly meta = signal<MetaDemandes | null>(null);
  readonly onglet = signal<OngletDemandes>('a_traiter');
  readonly pret = signal(false);
  readonly filtres = signal<FiltresDemandesAdmin>(FILTRES_DEMANDES_DEFAUT);
  readonly compteurs = signal<CompteursGroupeDemandes | null>(null);

  readonly demandes = signal<DemandeLocation[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly chargementListe = signal(false);
  readonly erreurListe = signal<string | null>(null);

  readonly demandeOuverteId = signal<number | null>(null);

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / TAILLE_PAGE)));

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  private demarre = false;
  private abonnementListe?: Subscription;

  ngOnInit(): void {
    const partenaireFixe = this.partenaireFixe();
    if (partenaireFixe) {
      this.filtres.update((f) => ({ ...f, partenaire: partenaireFixe }));
    }

    this.service.meta().subscribe({
      next: (meta) => this.meta.set(meta),
      error: () => undefined,
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('demande'));
      if (id > 0) {
        this.ouvrirDepuisLien(id);
      } else if (!this.demarre) {
        this.initialiser();
      }
    });
  }

  private initialiser(): void {
    this.demarre = true;
    this.pret.set(true);
    this.chargerListe();
  }

  private ouvrirDepuisLien(id: number): void {
    this.demarre = true;
    this.service.detail(id).subscribe({
      next: (detail) => {
        const groupe = this.meta()?.statuts.find((s) => s.valeur === detail.statut)?.groupe;
        const onglet = ONGLETS_DEMANDES.find((o) => o.valeur === groupe)?.valeur ?? 'toutes';
        this.onglet.set(onglet);
        this.page.set(1);
        this.demandeOuverteId.set(id);
        this.pret.set(true);
        this.chargerListe();
      },
      error: (erreur: unknown) => {
        this.erreurListe.set(extraireMessageErreur(erreur));
        this.demandeOuverteId.set(id);
        if (!this.pret()) {
          this.onglet.set('a_traiter');
          this.pret.set(true);
          this.chargerListe();
        }
      },
    });
  }

  private groupeCourant(): string | null {
    return this.onglet() === 'toutes' ? null : this.onglet();
  }

  chargerListe(silencieux = false): void {
    if (!silencieux) {
      this.chargementListe.set(true);
    }
    this.erreurListe.set(null);

    this.abonnementListe?.unsubscribe();
    this.abonnementListe = this.service
      .lister(this.filtres(), this.groupeCourant(), this.page(), TAILLE_PAGE)
      .subscribe({
        next: (reponse) => {
          this.chargementListe.set(false);
          this.demandes.set(reponse.results);
          this.total.set(reponse.count);
          this.compteurs.set(reponse.compteurs_groupe);
        },
        error: (erreur: unknown) => {
          this.chargementListe.set(false);
          this.erreurListe.set(extraireMessageErreur(erreur));
        },
      });
  }

  compteur(onglet: OngletDemandes): number | null {
    const compteurs = this.compteurs();
    if (!compteurs) return null;
    return onglet === 'toutes' ? compteurs.total : compteurs[onglet];
  }

  rafraichir(): void {
    this.chargerListe();
  }

  changerOnglet(onglet: OngletDemandes): void {
    if (onglet === this.onglet()) return;
    this.onglet.set(onglet);
    this.page.set(1);
    this.chargerListe();
  }

  surFiltres(filtres: FiltresDemandesAdmin): void {
    this.filtres.set(filtres);
    this.page.set(1);
    this.chargerListe();
  }

  changerPage(page: number): void {
    this.page.set(page);
    this.chargerListe();
  }

  ouvrirDetail(id: number): void {
    this.demandeOuverteId.set(id);
  }

  fermerDetail(): void {
    this.demandeOuverteId.set(null);
    if (this.route.snapshot.queryParamMap.has('demande')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { demande: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  surDetailModifie(): void {
    this.chargerListe(true);
  }

  exporter(): void {
    if (this.exportEnCours()) return;
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv(this.filtres(), this.groupeCourant()).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }
}

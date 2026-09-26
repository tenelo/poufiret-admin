import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, filter, fromEvent, interval, merge } from 'rxjs';

import { CommandesAdminService } from './commandes-admin.service';
import { DetailCommandeAdmin } from './detail-commande-admin/detail-commande-admin';
import { FiltresCommandes } from './filtres-commandes/filtres-commandes';
import { ListeCommandes } from './liste-commandes/liste-commandes';
import { FiltreDepuisGraphique, TableauBordCommandes } from './tableau-de-bord-commandes/tableau-de-bord-commandes';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import {
  CommandeAdmin,
  CompteursGroupe,
  FILTRES_COMMANDES_DEFAUT,
  FiltresCommandesAdmin,
  MetaCommandes,
  ONGLETS_COMMANDES,
  OngletCommandes,
} from '../../../modeles/commande-admin.model';

const TAILLE_PAGE = 20;
const INTERVALLE_RAFRAICHISSEMENT_MS = 30000;

/**
 * Centre de gestion des commandes (admin / super-admin, capacité gerer_commandes) : onglets
 * Tableau de bord | À traiter | En cours | Terminées | Annulées | Toutes avec compteurs, filtres
 * communs, liste, détail en panneau latéral et export CSV. Statuts, groupes et libellés viennent
 * du backend (meta) ; l'onglet « À traiter » se rafraîchit toutes les 30 s (en pause si l'onglet du
 * navigateur est masqué). ?commande=<id> ouvre directement le détail (et l'onglet du groupe).
 */
@Component({
  selector: 'app-commandes-admin',
  imports: [FiltresCommandes, ListeCommandes, TableauBordCommandes, DetailCommandeAdmin],
  templateUrl: './commandes-admin.html',
  styleUrl: './commandes-admin.scss',
})
export class CommandesAdmin implements OnInit {
  private readonly service = inject(CommandesAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly onglets = ONGLETS_COMMANDES;
  readonly taillePage = TAILLE_PAGE;

  readonly meta = signal<MetaCommandes | null>(null);
  readonly onglet = signal<OngletCommandes>('tableau');
  /** True une fois l'onglet de départ déterminé (compteurs ou lien direct). */
  readonly pret = signal(false);
  readonly filtres = signal<FiltresCommandesAdmin>(FILTRES_COMMANDES_DEFAUT);
  readonly compteurs = signal<CompteursGroupe | null>(null);

  readonly commandes = signal<CommandeAdmin[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly chargementListe = signal(false);
  readonly erreurListe = signal<string | null>(null);

  readonly commandeOuverteId = signal<number | null>(null);

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  /** Groupe envoyé à l'API (null pour « Toutes » et pour le tableau de bord). */
  readonly groupeCourant = computed<string | null>(() => {
    const onglet = this.onglet();
    return onglet === 'tableau' || onglet === 'toutes' ? null : onglet;
  });

  private demarre = false;
  private abonnementListe?: Subscription;

  ngOnInit(): void {
    this.service.meta().subscribe({
      next: (meta) => this.meta.set(meta),
      // Sans meta, les filtres mode de livraison / statut n'ont pas d'options, le reste fonctionne.
      error: () => undefined,
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('commande'));
      if (id > 0) {
        this.ouvrirDepuisLien(id);
      } else if (!this.demarre) {
        this.initialiser();
      }
    });

    // « À traiter » : rafraîchissement toutes les 30 s, suspendu quand l'onglet du navigateur est
    // masqué et repris immédiatement à son retour.
    merge(
      interval(INTERVALLE_RAFRAICHISSEMENT_MS),
      fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!document.hidden && this.pret() && this.onglet() === 'a_traiter') {
          this.chargerListe(true);
        }
      });
  }

  // ---- Démarrage ----

  /** Onglet par défaut : « À traiter » s'il y a des commandes à traiter, sinon le tableau de bord. */
  private initialiser(): void {
    this.demarre = true;
    this.service.lister(this.filtres(), null, 1, 1).subscribe({
      next: (reponse) => {
        this.compteurs.set(reponse.compteurs_groupe);
        this.onglet.set(reponse.compteurs_groupe.a_traiter > 0 ? 'a_traiter' : 'tableau');
        this.pret.set(true);
        this.chargerContenu();
      },
      error: () => {
        this.onglet.set('tableau');
        this.pret.set(true);
      },
    });
  }

  /** Lien direct ?commande=<id> : ouvre le détail et l'onglet du groupe de la commande. */
  private ouvrirDepuisLien(id: number): void {
    this.demarre = true;
    this.service.detail(id).subscribe({
      next: (detail) => {
        const onglet = ONGLETS_COMMANDES.find((o) => o.valeur === detail.groupe)?.valeur ?? 'toutes';
        this.onglet.set(onglet);
        this.filtres.update((f) => this.statutCompatible({ ...f }, onglet));
        this.page.set(1);
        this.commandeOuverteId.set(id);
        this.pret.set(true);
        this.chargerContenu();
      },
      error: (erreur: unknown) => {
        this.erreurListe.set(extraireMessageErreur(erreur));
        this.commandeOuverteId.set(id);
        if (!this.pret()) {
          this.onglet.set('toutes');
          this.pret.set(true);
          this.chargerContenu();
        }
      },
    });
  }

  // ---- Chargement ----

  private chargerContenu(): void {
    if (this.onglet() === 'tableau') {
      this.chargerCompteurs();
    } else {
      this.chargerListe();
    }
  }

  /** Compteurs des onglets quand la liste n'est pas chargée (tableau de bord). */
  private chargerCompteurs(): void {
    this.service.lister(this.filtres(), null, 1, 1).subscribe({
      next: (reponse) => this.compteurs.set(reponse.compteurs_groupe),
      error: () => undefined,
    });
  }

  chargerListe(silencieux = false): void {
    if (!silencieux) {
      this.chargementListe.set(true);
    }
    this.erreurListe.set(null);

    // À traiter : les plus anciennes en premier ; ailleurs, les plus récentes.
    const ordering = this.onglet() === 'a_traiter' ? 'cree_le' : '-cree_le';

    this.abonnementListe?.unsubscribe();
    this.abonnementListe = this.service
      .lister(this.filtres(), this.groupeCourant(), this.page(), TAILLE_PAGE, ordering)
      .subscribe({
        next: (reponse) => {
          this.chargementListe.set(false);
          this.commandes.set(reponse.results);
          this.total.set(reponse.count);
          this.compteurs.set(reponse.compteurs_groupe);
        },
        error: (erreur: unknown) => {
          this.chargementListe.set(false);
          this.erreurListe.set(extraireMessageErreur(erreur));
        },
      });
  }

  compteur(onglet: OngletCommandes): number | null {
    const compteurs = this.compteurs();
    if (!compteurs || onglet === 'tableau') return null;
    return onglet === 'toutes' ? compteurs.total : compteurs[onglet];
  }

  // ---- Interactions ----

  /** Bouton « Rafraîchir » : recharge la liste, ou les compteurs (le tableau de bord se recharge sur changement de filtre). */
  rafraichir(): void {
    this.chargerContenu();
  }

  changerOnglet(onglet: OngletCommandes): void {
    if (onglet === this.onglet()) return;
    this.onglet.set(onglet);
    this.page.set(1);
    this.filtres.update((f) => this.statutCompatible({ ...f }, onglet));
    this.chargerContenu();
  }

  surFiltres(filtres: FiltresCommandesAdmin): void {
    this.filtres.set(filtres);
    this.page.set(1);
    this.chargerContenu();
  }

  /** Clic sur un segment du tableau de bord : onglet « Toutes » avec le filtre correspondant. */
  surFiltreGraphique(filtre: FiltreDepuisGraphique): void {
    this.filtres.update((f) => ({
      ...f,
      statut: filtre.statut ?? f.statut,
      partenaire: filtre.partenaire ?? f.partenaire,
      departement: filtre.departement ?? f.departement,
    }));
    this.onglet.set('toutes');
    this.page.set(1);
    this.chargerListe();
  }

  changerPage(page: number): void {
    this.page.set(page);
    this.chargerListe();
  }

  ouvrirDetail(id: number): void {
    this.commandeOuverteId.set(id);
  }

  fermerDetail(): void {
    this.commandeOuverteId.set(null);
    if (this.route.snapshot.queryParamMap.has('commande')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { commande: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /** Après une action dans le détail : la liste (ou les compteurs) se met à jour. */
  surDetailModifie(): void {
    if (this.onglet() === 'tableau') {
      this.chargerCompteurs();
    } else {
      this.chargerListe(true);
    }
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

  /** Le statut filtré doit appartenir au groupe de l'onglet ; sinon il est retiré. */
  private statutCompatible(filtres: FiltresCommandesAdmin, onglet: OngletCommandes): FiltresCommandesAdmin {
    if (!filtres.statut || onglet === 'tableau' || onglet === 'toutes') {
      return filtres;
    }
    const statut = this.meta()?.statuts.find((s) => s.valeur === filtres.statut);
    return statut && statut.groupe === onglet ? filtres : { ...filtres, statut: '' };
  }
}

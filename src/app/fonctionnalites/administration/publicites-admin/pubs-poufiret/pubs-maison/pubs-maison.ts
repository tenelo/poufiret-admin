import { Component, OnInit, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { PubsPoufiretService } from '../pubs-poufiret.service';
import { DialogPubMaison } from './dialog-pub-maison/dialog-pub-maison';
import { CategoriesAdminService } from '../../../categories/categories-admin.service';
import { GeographieService } from '../../../geographie/geographie.service';
import { extraireMessageErreur } from '../../../tableau-de-bord-admin/extraire-message-erreur';
import { CategorieAdmin } from '../../../../../modeles/categorie-admin.model';
import { OptionGeo } from '../../../../../modeles/geographie.model';
import {
  FILTRES_PUBS_POUFIRET_DEFAUT,
  FiltreActifPubPoufiret,
  PubPoufiretAdmin,
} from '../../../../../modeles/pub-poufiret.model';

/**
 * Onglet « Pubs maison » (pubs Poufiret du carrousel, capacité gerer_pubs_poufiret) : cartes,
 * création/modification, activer/désactiver, suppression, réordonnancement par glisser-déposer,
 * export CSV. Catégories/régions/départements chargés à part (droits distincts côté backend :
 * gerer_parametres / gerer_geographie) — tolérant si un admin n'a que gerer_pubs_poufiret.
 */
@Component({
  selector: 'app-pubs-maison',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, DialogPubMaison],
  templateUrl: './pubs-maison.html',
  styleUrl: './pubs-maison.scss',
})
export class PubsMaison implements OnInit {
  private readonly service = inject(PubsPoufiretService);
  private readonly categoriesService = inject(CategoriesAdminService);
  private readonly geoService = inject(GeographieService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly pubs = signal<PubPoufiretAdmin[]>([]);
  readonly filtreActif = signal<FiltreActifPubPoufiret>(FILTRES_PUBS_POUFIRET_DEFAUT.estActive);

  readonly categoriesActives = signal<CategorieAdmin[]>([]);
  readonly erreurCategories = signal<string | null>(null);
  readonly regions = signal<OptionGeo[]>([]);
  readonly departements = signal<OptionGeo[]>([]);
  readonly erreurGeo = signal<string | null>(null);

  readonly dialogPub = signal<{ pub: PubPoufiretAdmin | null } | null>(null);
  readonly pubASupprimer = signal<PubPoufiretAdmin | null>(null);
  readonly suppressionEnCours = signal(false);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);
  readonly exportEnCours = signal(false);

  ngOnInit(): void {
    this.charger();
    this.chargerCategories();
    this.chargerGeo();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);
    this.service.chargerPubs({ estActive: this.filtreActif(), page: 1, pageSize: 100 }).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.pubs.set(reponse.results);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private chargerCategories(): void {
    this.categoriesService.lister(false).subscribe({
      next: (categories) => {
        this.categoriesActives.set(categories.filter((c) => c.est_active));
      },
      error: (erreur: unknown) => this.erreurCategories.set(extraireMessageErreur(erreur)),
    });
  }

  private chargerGeo(): void {
    this.geoService.options('regions').subscribe({
      next: (options) => this.regions.set(options),
      error: (erreur: unknown) => this.erreurGeo.set(extraireMessageErreur(erreur)),
    });
    this.geoService.options('departements').subscribe({
      next: (options) => this.departements.set(options),
      error: (erreur: unknown) => this.erreurGeo.set(extraireMessageErreur(erreur)),
    });
  }

  surFiltreActif(valeur: string): void {
    this.filtreActif.set(valeur as FiltreActifPubPoufiret);
    this.charger();
  }

  nomRegion(id: number | null): string | null {
    return id === null ? null : this.regions().find((r) => r.id === id)?.nom ?? null;
  }

  nomDepartement(id: number | null): string | null {
    return id === null ? null : this.departements().find((d) => d.id === id)?.nom ?? null;
  }

  formaterDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  libellePortee(pub: PubPoufiretAdmin): string {
    if (pub.portee === 'region') return `Région${this.nomRegion(pub.region) ? ' : ' + this.nomRegion(pub.region) : ''}`;
    if (pub.portee === 'departement') {
      return `Département${this.nomDepartement(pub.departement) ? ' : ' + this.nomDepartement(pub.departement) : ''}`;
    }
    return 'Tout le monde';
  }

  // ---- Création / modification ----

  ouvrirCreation(): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.dialogPub.set({ pub: null });
  }

  ouvrirModification(pub: PubPoufiretAdmin): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.dialogPub.set({ pub });
  }

  fermerDialog(): void {
    this.dialogPub.set(null);
  }

  surReussite(message: string): void {
    this.dialogPub.set(null);
    this.messageSucces.set(message);
    this.charger();
  }

  // ---- Activer / désactiver ----

  basculerActive(pub: PubPoufiretAdmin): void {
    this.messageErreur.set(null);
    const nouvelleValeur = !pub.est_active;
    this.pubs.update((liste) => liste.map((p) => (p.id === pub.id ? { ...p, est_active: nouvelleValeur } : p)));
    this.service.basculerActivePub(pub.id, nouvelleValeur).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }

  // ---- Suppression ----

  demanderSuppression(pub: PubPoufiretAdmin): void {
    this.messageErreur.set(null);
    this.pubASupprimer.set(pub);
  }

  annulerSuppression(): void {
    this.pubASupprimer.set(null);
  }

  confirmerSuppression(): void {
    const pub = this.pubASupprimer();
    if (!pub || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);
    this.service.supprimerPub(pub.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.pubASupprimer.set(null);
        this.pubs.update((liste) => liste.filter((p) => p.id !== pub.id));
        this.messageSucces.set(`Pub « ${pub.titre} » supprimée.`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.pubASupprimer.set(null);
      },
    });
  }

  // ---- Réordonnancement (glisser-déposer) ----

  /** Met à jour l'ordre localement (retour visuel immédiat), puis persiste ; recharge depuis le
   *  serveur (annulant la mise à jour locale) si le backend refuse. */
  surDepot(evenement: CdkDragDrop<PubPoufiretAdmin[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const reordonnees = [...this.pubs()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);
    this.pubs.set(reordonnees);
    this.service.reordonnerPubs(reordonnees.map((p) => p.id)).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }

  // ---- Export CSV ----

  exporter(): void {
    if (this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.service.exporterPubsCsv().subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

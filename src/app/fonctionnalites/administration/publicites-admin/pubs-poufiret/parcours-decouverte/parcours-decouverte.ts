import { Component, OnInit, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { PubsPoufiretService } from '../pubs-poufiret.service';
import { DialogEcranDecouverte } from './dialog-ecran-decouverte/dialog-ecran-decouverte';
import { CategoriesAdminService } from '../../../categories/categories-admin.service';
import { extraireMessageErreur } from '../../../tableau-de-bord-admin/extraire-message-erreur';
import { CategorieAdmin } from '../../../../../modeles/categorie-admin.model';
import { EcranDecouverteAdmin } from '../../../../../modeles/pub-poufiret.model';

/**
 * Onglet « Parcours Découvrir Poufiret » (capacité gerer_pubs_poufiret) : écrans ordonnés par
 * glisser-déposer, création/modification, activer/désactiver, suppression, publication (avec le
 * message d'erreur serveur tel quel, ex. nombre d'écrans actifs hors de la plage 3-8).
 */
@Component({
  selector: 'app-parcours-decouverte',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, DialogEcranDecouverte],
  templateUrl: './parcours-decouverte.html',
  styleUrl: './parcours-decouverte.scss',
})
export class ParcoursDecouverte implements OnInit {
  private readonly service = inject(PubsPoufiretService);
  private readonly categoriesService = inject(CategoriesAdminService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly ecrans = signal<EcranDecouverteAdmin[]>([]);

  readonly categoriesActives = signal<CategorieAdmin[]>([]);
  readonly erreurCategories = signal<string | null>(null);

  readonly dialogEcran = signal<{ ecran: EcranDecouverteAdmin | null } | null>(null);
  readonly ecranASupprimer = signal<EcranDecouverteAdmin | null>(null);
  readonly suppressionEnCours = signal(false);

  readonly publicationEnCours = signal(false);
  readonly erreurPublication = signal<string | null>(null);
  readonly versionParcours = signal<number | null>(null);
  readonly parcoursActif = signal<boolean | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly nbEcransActifs = () => this.ecrans().filter((e) => e.est_actif).length;

  ngOnInit(): void {
    this.charger();
    this.categoriesService.lister(false).subscribe({
      next: (categories) => this.categoriesActives.set(categories.filter((c) => c.est_active)),
      error: (erreur: unknown) => this.erreurCategories.set(extraireMessageErreur(erreur)),
    });
    this.service.chargerReglages().subscribe({
      next: (reglages) => {
        this.versionParcours.set(reglages.version_parcours);
        this.parcoursActif.set(reglages.parcours_actif);
      },
      error: () => undefined,
    });
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);
    this.service.chargerEcrans().subscribe({
      next: (ecrans) => {
        this.chargementEnCours.set(false);
        this.ecrans.set(ecrans);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Création / modification ----

  ouvrirCreation(): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.dialogEcran.set({ ecran: null });
  }

  ouvrirModification(ecran: EcranDecouverteAdmin): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.dialogEcran.set({ ecran });
  }

  fermerDialog(): void {
    this.dialogEcran.set(null);
  }

  surReussite(message: string): void {
    this.dialogEcran.set(null);
    this.messageSucces.set(message);
    this.charger();
  }

  // ---- Activer / désactiver ----

  basculerActif(ecran: EcranDecouverteAdmin): void {
    this.messageErreur.set(null);
    const nouvelleValeur = !ecran.est_actif;
    this.ecrans.update((liste) => liste.map((e) => (e.id === ecran.id ? { ...e, est_actif: nouvelleValeur } : e)));
    this.service.basculerActifEcran(ecran.id, nouvelleValeur).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }

  // ---- Suppression ----

  demanderSuppression(ecran: EcranDecouverteAdmin): void {
    this.messageErreur.set(null);
    this.ecranASupprimer.set(ecran);
  }

  annulerSuppression(): void {
    this.ecranASupprimer.set(null);
  }

  confirmerSuppression(): void {
    const ecran = this.ecranASupprimer();
    if (!ecran || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);
    this.service.supprimerEcran(ecran.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.ecranASupprimer.set(null);
        this.ecrans.update((liste) => liste.filter((e) => e.id !== ecran.id));
        this.messageSucces.set(`Écran « ${ecran.titre} » supprimé.`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.ecranASupprimer.set(null);
      },
    });
  }

  // ---- Réordonnancement (glisser-déposer) ----

  surDepot(evenement: CdkDragDrop<EcranDecouverteAdmin[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const reordonnees = [...this.ecrans()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);
    this.ecrans.set(reordonnees);
    this.service.reordonnerEcrans(reordonnees.map((e) => e.id)).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }

  // ---- Publication ----

  publier(): void {
    if (this.publicationEnCours()) {
      return;
    }
    this.publicationEnCours.set(true);
    this.erreurPublication.set(null);
    this.service.publierParcours().subscribe({
      next: (reponse) => {
        this.publicationEnCours.set(false);
        this.versionParcours.set(reponse.version_parcours);
        this.messageSucces.set(
          `Parcours publié : version ${reponse.version_parcours}, ${reponse.nb_ecrans} écran(s).`,
        );
      },
      // Message du serveur tel quel (ex. nombre d'écrans actifs hors de la plage autorisée).
      error: (erreur: unknown) => {
        this.publicationEnCours.set(false);
        this.erreurPublication.set(extraireMessageErreur(erreur));
      },
    });
  }
}

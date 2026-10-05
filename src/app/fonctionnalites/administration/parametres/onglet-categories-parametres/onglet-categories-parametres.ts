import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { ParametresCategoriesService } from '../parametres-categories.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { CategorieOrdonnee } from '../../../../modeles/parametres-categories.model';

interface GroupeCategories {
  categorie: CategorieOrdonnee;
  enfants: CategorieOrdonnee[];
}

const TAILLE_APERCU = 8;

/**
 * Onglet "Catégories" de Paramètres (capacité gerer_parametres) : ordre d'affichage
 * (glisser-déposer, boutons mobiles) et visibilité des catégories dans la grille de
 * l'application, avec un aperçu des 8 premières catégories actives.
 */
@Component({
  selector: 'app-onglet-categories-parametres',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NgTemplateOutlet],
  templateUrl: './onglet-categories-parametres.html',
  styleUrl: './onglet-categories-parametres.scss',
})
export class OngletCategoriesParametres implements OnInit {
  private readonly service = inject(ParametresCategoriesService);

  readonly categories = signal<CategorieOrdonnee[]>([]);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);

  readonly parentsDeplies = signal<Set<number>>(new Set());

  readonly groupes = computed<GroupeCategories[]>(() => {
    const toutes = this.categories();
    return toutes
      .filter((c) => c.parent_id === null)
      .sort((a, b) => a.ordre - b.ordre)
      .map((racine) => ({
        categorie: racine,
        enfants: toutes.filter((c) => c.parent_id === racine.id).sort((a, b) => a.ordre - b.ordre),
      }));
  });

  readonly apercuGrille = computed(() =>
    this.groupes()
      .map((g) => g.categorie)
      .filter((c) => c.est_active)
      .slice(0, TAILLE_APERCU),
  );

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.lister().subscribe({
      next: (categories) => {
        this.chargementEnCours.set(false);
        this.categories.set(categories);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerDeplie(id: number): void {
    this.parentsDeplies.update((s) => {
      const copie = new Set(s);
      if (copie.has(id)) {
        copie.delete(id);
      } else {
        copie.add(id);
      }
      return copie;
    });
  }

  estDeplie(id: number): boolean {
    return this.parentsDeplies().has(id);
  }

  basculerActive(categorie: CategorieOrdonnee): void {
    const nouvelleValeur = !categorie.est_active;
    this.categories.update((liste) =>
      liste.map((c) => (c.id === categorie.id ? { ...c, est_active: nouvelleValeur } : c)),
    );
    this.messageErreur.set(null);

    this.service.modifierActive(categorie.id, nouvelleValeur).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.categories.update((liste) =>
          liste.map((c) => (c.id === categorie.id ? { ...c, est_active: !nouvelleValeur } : c)),
        );
      },
    });
  }

  surDepotRacines(evenement: CdkDragDrop<CategorieOrdonnee[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const racines = this.groupes().map((g) => g.categorie);
    const reordonnees = [...racines];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);
    this.reordonnerGroupe(null, reordonnees.map((c) => c.id));
  }

  surDepotEnfants(parentId: number, evenement: CdkDragDrop<CategorieOrdonnee[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const groupe = this.groupes().find((g) => g.categorie.id === parentId);
    if (!groupe) {
      return;
    }
    const reordonnees = [...groupe.enfants];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);
    this.reordonnerGroupe(parentId, reordonnees.map((c) => c.id));
  }

  peutMonter(categorie: CategorieOrdonnee): boolean {
    return this.indexDansGroupe(categorie) > 0;
  }

  peutDescendre(categorie: CategorieOrdonnee): boolean {
    const index = this.indexDansGroupe(categorie);
    return index !== -1 && index < this.groupeDe(categorie).length - 1;
  }

  monterEnPremiere(categorie: CategorieOrdonnee): void {
    const groupe = this.groupeDe(categorie);
    const index = this.indexDansGroupe(categorie);
    if (index <= 0) {
      return;
    }
    const reordonnees = [...groupe];
    const [item] = reordonnees.splice(index, 1);
    reordonnees.unshift(item);
    this.reordonnerGroupe(categorie.parent_id, reordonnees.map((c) => c.id));
  }

  monter(categorie: CategorieOrdonnee): void {
    this.deplacerDe(categorie, -1);
  }

  descendre(categorie: CategorieOrdonnee): void {
    this.deplacerDe(categorie, 1);
  }

  private deplacerDe(categorie: CategorieOrdonnee, delta: number): void {
    const groupe = this.groupeDe(categorie);
    const index = this.indexDansGroupe(categorie);
    const nouvelIndex = index + delta;
    if (index === -1 || nouvelIndex < 0 || nouvelIndex >= groupe.length) {
      return;
    }
    const reordonnees = [...groupe];
    const [item] = reordonnees.splice(index, 1);
    reordonnees.splice(nouvelIndex, 0, item);
    this.reordonnerGroupe(categorie.parent_id, reordonnees.map((c) => c.id));
  }

  private groupeDe(categorie: CategorieOrdonnee): CategorieOrdonnee[] {
    if (categorie.parent_id === null) {
      return this.groupes().map((g) => g.categorie);
    }
    return this.groupes().find((g) => g.categorie.id === categorie.parent_id)?.enfants ?? [];
  }

  private indexDansGroupe(categorie: CategorieOrdonnee): number {
    return this.groupeDe(categorie).findIndex((c) => c.id === categorie.id);
  }

  /** Met à jour `ordre` localement (retour visuel immédiat), puis persiste ; recharge depuis
   *  le serveur (annulant la mise à jour locale) si le backend refuse. */
  private reordonnerGroupe(parentId: number | null, ordreIds: number[]): void {
    const indexParId = new Map(ordreIds.map((id, index) => [id, index]));
    this.categories.update((liste) =>
      liste.map((c) => (c.parent_id === parentId && indexParId.has(c.id) ? { ...c, ordre: indexParId.get(c.id)! } : c)),
    );
    this.messageErreur.set(null);

    this.service.definirOrdre(parentId, ordreIds).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }
}

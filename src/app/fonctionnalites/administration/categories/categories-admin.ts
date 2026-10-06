import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { CategoriesAdminService } from './categories-admin.service';
import { DialogCategorie } from './dialog-categorie/dialog-categorie';
import { extraireMessageErreur, erreurChamp } from '../tableau-de-bord-admin/extraire-message-erreur';
import {
  CategorieAdmin,
  ErreursCategorieAdmin,
  RequeteCategorieAdmin,
  TypePartenaireCategorie,
} from '../../../modeles/categorie-admin.model';

interface GroupeCategories {
  categorie: CategorieAdmin;
  enfants: CategorieAdmin[];
}

interface ActionConfirmation {
  type: 'supprimer' | 'archiver';
  categorie: CategorieAdmin;
}

const TAILLE_APERCU = 8;
const DUREE_MESSAGE_MS = 4000;

/**
 * Écran admin "Catégories" (capacité gerer_parametres) : arborescence des catégories
 * de la grille de l'application — ordre d'affichage (glisser-déposer, boutons
 * mobiles) et visibilité reprennent l'ancien onglet Paramètres → Catégories (déplacé
 * ici) ; s'y ajoutent création/édition (icône, image, parent, types de partenaire
 * liés, mots-clés), suppression (avec repli "Archiver" sur conflit 409) et archivage.
 */
@Component({
  selector: 'app-categories-admin',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NgTemplateOutlet, DialogCategorie],
  templateUrl: './categories-admin.html',
  styleUrl: './categories-admin.scss',
})
export class CategoriesAdmin implements OnInit {
  private readonly service = inject(CategoriesAdminService);

  readonly categories = signal<CategorieAdmin[]>([]);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly afficherArchivees = signal(false);

  readonly typesPartenaire = signal<TypePartenaireCategorie[]>([]);

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

  readonly racines = computed(() => this.groupes().map((g) => g.categorie));

  readonly apercuGrille = computed(() =>
    this.racines()
      .filter((c) => c.est_active)
      .slice(0, TAILLE_APERCU),
  );

  // ---- Dialog création / édition ----
  readonly dialogOuvert = signal(false);
  readonly categorieEnEdition = signal<CategorieAdmin | null>(null);
  readonly parentPreselectionne = signal<number | null>(null);
  readonly enregistrementEnCours = signal(false);
  private readonly derniereErreurDialog = signal<unknown>(null);

  readonly erreursDialog = computed<ErreursCategorieAdmin | null>(() => {
    const erreur = this.derniereErreurDialog();
    if (!erreur) {
      return null;
    }
    return { nom: erreurChamp(erreur, 'nom'), general: extraireMessageErreur(erreur) };
  });

  // ---- Confirmations (supprimer, archiver) ----
  readonly confirmation = signal<ActionConfirmation | null>(null);
  readonly actionEnCours = signal(false);
  readonly conflitSuppression = signal<string | null>(null);
  readonly erreurConfirmation = signal<string | null>(null);

  // ---- Message éphémère ----
  readonly message = signal<{ texte: string; erreur: boolean } | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.charger();
    this.service.listerTypesPartenaire().subscribe({
      next: (types) => this.typesPartenaire.set(types),
      error: () => {
        // Non bloquant : le dialog fonctionne sans liste de types (section vide).
      },
    });
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.lister(this.afficherArchivees()).subscribe({
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

  basculerAfficherArchivees(): void {
    this.afficherArchivees.update((v) => !v);
    this.charger();
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

  basculerActive(categorie: CategorieAdmin): void {
    const nouvelleValeur = !categorie.est_active;
    this.categories.update((liste) =>
      liste.map((c) => (c.id === categorie.id ? { ...c, est_active: nouvelleValeur } : c)),
    );

    this.service.modifier(categorie.id, { est_active: nouvelleValeur }).subscribe({
      error: (erreur: unknown) => {
        this.afficherMessage(extraireMessageErreur(erreur), true);
        this.categories.update((liste) =>
          liste.map((c) => (c.id === categorie.id ? { ...c, est_active: !nouvelleValeur } : c)),
        );
      },
    });
  }

  // ---- Glisser-déposer / boutons Monter-Descendre (même niveau uniquement) ----

  surDepotRacines(evenement: CdkDragDrop<CategorieAdmin[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const reordonnees = [...this.racines()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);
    this.reordonnerGroupe(
      null,
      reordonnees.map((c) => c.id),
    );
  }

  surDepotEnfants(parentId: number, evenement: CdkDragDrop<CategorieAdmin[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const groupe = this.groupes().find((g) => g.categorie.id === parentId);
    if (!groupe) {
      return;
    }
    const reordonnees = [...groupe.enfants];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);
    this.reordonnerGroupe(
      parentId,
      reordonnees.map((c) => c.id),
    );
  }

  peutMonter(categorie: CategorieAdmin): boolean {
    return this.indexDansGroupe(categorie) > 0;
  }

  peutDescendre(categorie: CategorieAdmin): boolean {
    const index = this.indexDansGroupe(categorie);
    return index !== -1 && index < this.groupeDe(categorie).length - 1;
  }

  monterEnPremiere(categorie: CategorieAdmin): void {
    const groupe = this.groupeDe(categorie);
    const index = this.indexDansGroupe(categorie);
    if (index <= 0) {
      return;
    }
    const reordonnees = [...groupe];
    const [item] = reordonnees.splice(index, 1);
    reordonnees.unshift(item);
    this.reordonnerGroupe(
      categorie.parent_id,
      reordonnees.map((c) => c.id),
    );
  }

  monter(categorie: CategorieAdmin): void {
    this.deplacerDe(categorie, -1);
  }

  descendre(categorie: CategorieAdmin): void {
    this.deplacerDe(categorie, 1);
  }

  private deplacerDe(categorie: CategorieAdmin, delta: number): void {
    const groupe = this.groupeDe(categorie);
    const index = this.indexDansGroupe(categorie);
    const nouvelIndex = index + delta;
    if (index === -1 || nouvelIndex < 0 || nouvelIndex >= groupe.length) {
      return;
    }
    const reordonnees = [...groupe];
    const [item] = reordonnees.splice(index, 1);
    reordonnees.splice(nouvelIndex, 0, item);
    this.reordonnerGroupe(
      categorie.parent_id,
      reordonnees.map((c) => c.id),
    );
  }

  private groupeDe(categorie: CategorieAdmin): CategorieAdmin[] {
    if (categorie.parent_id === null) {
      return this.racines();
    }
    return this.groupes().find((g) => g.categorie.id === categorie.parent_id)?.enfants ?? [];
  }

  private indexDansGroupe(categorie: CategorieAdmin): number {
    return this.groupeDe(categorie).findIndex((c) => c.id === categorie.id);
  }

  /** Met à jour `ordre` localement (retour visuel immédiat), puis persiste ; recharge depuis
   *  le serveur (annulant la mise à jour locale) si le backend refuse. */
  private reordonnerGroupe(parentId: number | null, ordreIds: number[]): void {
    const indexParId = new Map(ordreIds.map((id, index) => [id, index]));
    this.categories.update((liste) =>
      liste.map((c) => (c.parent_id === parentId && indexParId.has(c.id) ? { ...c, ordre: indexParId.get(c.id)! } : c)),
    );

    this.service.definirOrdre(parentId, ordreIds).subscribe({
      error: (erreur: unknown) => {
        this.afficherMessage(extraireMessageErreur(erreur), true);
        this.charger();
      },
    });
  }

  // ---- Création / édition ----

  ouvrirCreationRacine(): void {
    this.categorieEnEdition.set(null);
    this.parentPreselectionne.set(null);
    this.derniereErreurDialog.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirCreationSousCategorie(racine: CategorieAdmin): void {
    this.categorieEnEdition.set(null);
    this.parentPreselectionne.set(racine.id);
    this.derniereErreurDialog.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(categorie: CategorieAdmin): void {
    this.categorieEnEdition.set(categorie);
    this.parentPreselectionne.set(categorie.parent_id);
    this.derniereErreurDialog.set(null);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
  }

  enregistrer(corps: RequeteCategorieAdmin): void {
    if (this.enregistrementEnCours()) {
      return;
    }
    this.enregistrementEnCours.set(true);
    this.derniereErreurDialog.set(null);

    const edition = this.categorieEnEdition();
    const requete$ = edition ? this.service.modifier(edition.id, corps) : this.service.creer(corps);

    requete$.subscribe({
      next: (categorie) => {
        this.enregistrementEnCours.set(false);
        this.dialogOuvert.set(false);
        this.afficherMessage(`« ${categorie.nom} » ${edition ? 'modifiée' : 'créée'} avec succès.`, false);
        this.charger();
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.derniereErreurDialog.set(erreur);
      },
    });
  }

  // ---- Suppression / archivage ----

  demanderSuppression(categorie: CategorieAdmin): void {
    this.reinitialiserConfirmation();
    this.confirmation.set({ type: 'supprimer', categorie });
  }

  demanderArchivage(categorie: CategorieAdmin): void {
    this.reinitialiserConfirmation();
    this.confirmation.set({ type: 'archiver', categorie });
  }

  annulerConfirmation(): void {
    this.confirmation.set(null);
  }

  private reinitialiserConfirmation(): void {
    this.conflitSuppression.set(null);
    this.erreurConfirmation.set(null);
  }

  confirmer(): void {
    const attente = this.confirmation();
    if (!attente || this.actionEnCours()) {
      return;
    }
    if (attente.type === 'supprimer') {
      this.supprimer(attente.categorie);
    } else {
      this.archiverCategorie(attente.categorie, true);
    }
  }

  /** Après un refus 409 à la suppression : propose d'archiver à la place. */
  archiverALaPlace(): void {
    const attente = this.confirmation();
    if (attente && !this.actionEnCours()) {
      this.archiverCategorie(attente.categorie, true);
    }
  }

  /** Désarchive directement, sans confirmation (action réversible, non destructive). */
  desarchiver(categorie: CategorieAdmin): void {
    this.archiverCategorie(categorie, false);
  }

  private supprimer(categorie: CategorieAdmin): void {
    this.actionEnCours.set(true);
    this.erreurConfirmation.set(null);
    this.conflitSuppression.set(null);

    this.service.supprimer(categorie.id).subscribe({
      next: () => {
        this.actionEnCours.set(false);
        this.confirmation.set(null);
        this.afficherMessage(`« ${categorie.nom} » supprimée.`, false);
        this.charger();
      },
      error: (erreur: unknown) => {
        this.actionEnCours.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
          this.conflitSuppression.set(extraireMessageErreur(erreur));
        } else {
          this.erreurConfirmation.set(extraireMessageErreur(erreur));
        }
      },
    });
  }

  private archiverCategorie(categorie: CategorieAdmin, archivee: boolean): void {
    this.actionEnCours.set(true);
    this.erreurConfirmation.set(null);

    this.service.archiver(categorie.id, archivee).subscribe({
      next: () => {
        this.actionEnCours.set(false);
        this.confirmation.set(null);
        this.afficherMessage(`« ${categorie.nom} » ${archivee ? 'archivée' : 'désarchivée'}.`, false);
        this.charger();
      },
      error: (erreur: unknown) => {
        this.actionEnCours.set(false);
        this.erreurConfirmation.set(extraireMessageErreur(erreur));
      },
    });
  }

  private afficherMessage(texte: string, erreur: boolean): void {
    this.message.set({ texte, erreur });
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.message.set(null), DUREE_MESSAGE_MS);
  }
}

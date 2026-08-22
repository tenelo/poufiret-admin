import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { MesCategoriesService } from './mes-categories.service';
import { MaCategorie } from '../../../modeles/ma-categorie.model';
import { CategorieGlobale } from '../../../modeles/categorie-globale.model';

// Taille max acceptée côté client pour une image de couverture de catégorie.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

interface EtatCategorie {
  categorie: MaCategorie;
  apercu: string | null;
  enCours: boolean;
}

/**
 * Page "Mes catégories" de l'espace partenaire : catégories choisies par le
 * partenaire parmi les catégories globales du catalogue (ajout/retrait libres,
 * sans validation admin ni quota), avec image de couverture par catégorie.
 */
@Component({
  selector: 'app-mes-categories',
  imports: [],
  templateUrl: './mes-categories.html',
  styleUrl: './mes-categories.scss',
})
export class MesCategories implements OnInit, OnDestroy {
  private readonly mesCategoriesService = inject(MesCategoriesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly categories = signal<EtatCategorie[]>([]);

  // ---- Détail d'une catégorie (panneau ouvert au clic sur une carte) ----
  readonly detailOuvertId = signal<number | null>(null);
  readonly detailOuvert = computed(
    () => this.categories().find((etat) => etat.categorie.id === this.detailOuvertId()) ?? null,
  );

  // ---- Retrait d'une catégorie ----
  readonly categorieARetirer = signal<EtatCategorie | null>(null);
  readonly retraitEnCours = signal(false);
  readonly erreurRetrait = signal<string | null>(null);

  // ---- Ajout d'une catégorie ----
  readonly dialogAjoutOuvert = signal(false);
  readonly categoriesGlobales = signal<CategorieGlobale[]>([]);
  readonly chargementGlobales = signal(false);
  readonly erreurGlobales = signal<string | null>(null);
  readonly ajoutEnCoursId = signal<number | null>(null);
  readonly erreurAjout = signal<string | null>(null);

  /** Catégories globales que le partenaire n'a pas encore. */
  readonly categoriesGlobalesDisponibles = computed(() => {
    const possedees = new Set(this.categories().map((etat) => etat.categorie.categorie));
    return this.categoriesGlobales().filter((c) => !possedees.has(c.id));
  });

  ngOnInit(): void {
    this.chargerCategories();
  }

  ngOnDestroy(): void {
    for (const etat of this.categories()) {
      if (etat.apercu) URL.revokeObjectURL(etat.apercu);
    }
  }

  chargerCategories(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.mesCategoriesService.listerMesCategories().subscribe({
      next: (categories) => {
        this.chargementEnCours.set(false);
        try {
          this.categories.set(
            categories.map((categorie) => ({ categorie, apercu: null, enCours: false })),
          );
        } catch {
          this.erreurChargement.set(
            "Réponse inattendue du serveur en chargeant les catégories. Contactez le support si le problème persiste.",
          );
        }
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  /** Appelé lors du choix d'un fichier pour la catégorie donnée (depuis le panneau détail). */
  selectionnerImage(evenement: Event, id: number): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = ''; // permet de resélectionner le même fichier plus tard

    if (!fichier) {
      return;
    }

    this.messageErreur.set(null);
    this.messageSucces.set(null);

    if (!fichier.type.startsWith('image/')) {
      this.messageErreur.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.messageErreur.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const url = URL.createObjectURL(fichier);
    this.mettreAJourEtat(id, (etat) => {
      if (etat.apercu) URL.revokeObjectURL(etat.apercu);
      return { ...etat, apercu: url, enCours: true };
    });

    this.mesCategoriesService.changerImageCouverture(id, fichier).subscribe({
      next: (categorie) => {
        this.mettreAJourEtat(id, (etat) => {
          if (etat.apercu) URL.revokeObjectURL(etat.apercu);
          return { categorie, apercu: null, enCours: false };
        });
        this.messageSucces.set(`Image de "${categorie.categorie_nom}" mise à jour avec succès.`);
      },
      error: (erreur: unknown) => {
        this.mettreAJourEtat(id, (etat) => ({ ...etat, enCours: false }));
        this.messageErreur.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Détail ----

  ouvrirDetail(etat: EtatCategorie): void {
    this.detailOuvertId.set(etat.categorie.id);
  }

  fermerDetail(): void {
    this.detailOuvertId.set(null);
  }

  // ---- Retrait ----

  demanderRetrait(etat: EtatCategorie): void {
    this.erreurRetrait.set(null);
    this.categorieARetirer.set(etat);
  }

  annulerRetrait(): void {
    this.categorieARetirer.set(null);
  }

  confirmerRetrait(): void {
    const cible = this.categorieARetirer();
    if (!cible || this.retraitEnCours()) {
      return;
    }
    this.retraitEnCours.set(true);
    this.erreurRetrait.set(null);

    this.mesCategoriesService.retirerCategorie(cible.categorie.id).subscribe({
      next: () => {
        this.retraitEnCours.set(false);
        this.categorieARetirer.set(null);
        this.categories.update((liste) => liste.filter((e) => e.categorie.id !== cible.categorie.id));
        this.messageSucces.set(`"${cible.categorie.categorie_nom}" retirée avec succès.`);
        if (this.detailOuvertId() === cible.categorie.id) {
          this.detailOuvertId.set(null);
        }
      },
      error: (erreur: unknown) => {
        this.retraitEnCours.set(false);
        // Inclut le cas 400 "dernière catégorie" : le message backend est repris tel quel.
        this.erreurRetrait.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Ajout ----

  ouvrirAjout(): void {
    this.erreurAjout.set(null);
    this.dialogAjoutOuvert.set(true);
    if (this.categoriesGlobales().length === 0) {
      this.chargerCategoriesGlobales();
    }
  }

  fermerAjout(): void {
    this.dialogAjoutOuvert.set(false);
  }

  chargerCategoriesGlobales(): void {
    this.chargementGlobales.set(true);
    this.erreurGlobales.set(null);

    this.mesCategoriesService.listerCategoriesGlobales().subscribe({
      next: (liste) => {
        this.chargementGlobales.set(false);
        this.categoriesGlobales.set(liste);
      },
      error: (erreur: unknown) => {
        this.chargementGlobales.set(false);
        this.erreurGlobales.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  ajouterCategorie(categorieGlobale: CategorieGlobale): void {
    if (this.ajoutEnCoursId()) {
      return;
    }
    this.ajoutEnCoursId.set(categorieGlobale.id);
    this.erreurAjout.set(null);

    this.mesCategoriesService.ajouterCategorie(categorieGlobale.id).subscribe({
      next: (categorie) => {
        this.ajoutEnCoursId.set(null);
        this.categories.update((liste) => [...liste, { categorie, apercu: null, enCours: false }]);
        this.messageSucces.set(`"${categorie.categorie_nom}" ajoutée avec succès.`);
        this.dialogAjoutOuvert.set(false);
      },
      error: (erreur: unknown) => {
        this.ajoutEnCoursId.set(null);
        this.erreurAjout.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  private mettreAJourEtat(id: number, transformer: (etat: EtatCategorie) => EtatCategorie): void {
    this.categories.update((liste) =>
      liste.map((etat) => (etat.categorie.id === id ? transformer(etat) : etat)),
    );
  }

  private extraireMessageErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      if (erreur.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
      }
      const corps = erreur.error;
      // Une page d'erreur HTML (ex. 500 Django hors mode debug) n'est pas un
      // message affichable : on retombe sur le message générique dans ce cas.
      if (typeof corps === 'string' && !/^\s*<(!doctype|html)/i.test(corps)) {
        return corps;
      }
      if (typeof corps?.message === 'string') {
        return corps.message;
      }
      if (typeof corps?.details?.detail === 'string') {
        return corps.details.detail;
      }
      if (typeof corps?.detail === 'string') {
        return corps.detail;
      }
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  }
}

import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { MesProduitsService } from '../mes-produits.service';
import { ImageArticle } from '../../../../modeles/image-article.model';
import { extraireMessageErreur } from '../extraire-message-erreur';

// Taille max acceptée côté client pour une image d'article.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Gestion des images d'un article (catalogue partenaire), affichée en overlay par le
 * composant parent : liste, ajout (avec quota du plan) et suppression.
 */
@Component({
  selector: 'app-gestion-images',
  imports: [],
  templateUrl: './gestion-images.html',
  styleUrl: './gestion-images.scss',
})
export class GestionImages implements OnInit, OnDestroy {
  private readonly mesProduitsService = inject(MesProduitsService);

  readonly articleId = input.required<number>();
  readonly nomArticle = input('');
  readonly quotaMax = input(Infinity);

  readonly ferme = output<void>();

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly images = signal<ImageArticle[]>([]);

  readonly fichierSelectionne = signal<File | null>(null);
  readonly apercuSelection = signal<string | null>(null);
  readonly estPrincipaleSelection = signal(false);
  readonly envoiEnCours = signal(false);

  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly imageAConfirmerSuppression = signal<ImageArticle | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly quotaAtteint = computed(() => this.images().length >= this.quotaMax());

  ngOnInit(): void {
    this.chargerImages();
  }

  ngOnDestroy(): void {
    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
  }

  chargerImages(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.mesProduitsService.listerImages(this.articleId()).subscribe({
      next: (images) => {
        this.chargementEnCours.set(false);
        this.images.set(images);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  selectionnerImage(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';

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

    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
    this.fichierSelectionne.set(fichier);
    this.apercuSelection.set(URL.createObjectURL(fichier));
    this.estPrincipaleSelection.set(false);
  }

  annulerSelection(): void {
    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
    this.fichierSelectionne.set(null);
    this.apercuSelection.set(null);
    this.estPrincipaleSelection.set(false);
  }

  ajouterImage(): void {
    const fichier = this.fichierSelectionne();
    if (!fichier || this.envoiEnCours() || this.quotaAtteint()) {
      return;
    }

    this.envoiEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.mesProduitsService
      .ajouterImage(this.articleId(), fichier, { estPrincipale: this.estPrincipaleSelection() })
      .subscribe({
        next: (image) => {
          this.envoiEnCours.set(false);
          this.images.update((liste) => [...liste, image]);
          this.annulerSelection();
          this.messageSucces.set('Image ajoutée avec succès.');
        },
        error: (erreur: unknown) => {
          this.envoiEnCours.set(false);
          this.messageErreur.set(extraireMessageErreur(erreur));
        },
      });
  }

  demanderSuppression(image: ImageArticle): void {
    this.imageAConfirmerSuppression.set(image);
  }

  annulerSuppression(): void {
    this.imageAConfirmerSuppression.set(null);
  }

  confirmerSuppression(): void {
    const image = this.imageAConfirmerSuppression();
    if (!image) {
      return;
    }

    this.suppressionEnCoursId.set(image.id);
    this.messageErreur.set(null);

    this.mesProduitsService.supprimerImage(image.id).subscribe({
      next: () => {
        this.suppressionEnCoursId.set(null);
        this.imageAConfirmerSuppression.set(null);
        this.images.update((liste) => liste.filter((i) => i.id !== image.id));
        this.messageSucces.set('Image supprimée avec succès.');
      },
      error: (erreur: unknown) => {
        this.suppressionEnCoursId.set(null);
        this.imageAConfirmerSuppression.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { RestaurantService, PrefixeRestaurant } from '../../restaurant.service';
import { ImagePlatCarte } from '../../../../modeles/carte-restaurant.model';
import { extraireMessageErreur } from '../../extraire-message-erreur';

const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Gestion des images d'un plat de carte restaurant : liste, ajout, image principale et
 * glisser-déposer pour l'ordre — même logique que GestionImages (catalogue), adaptée au
 * RestaurantService paramétré par préfixe.
 */
@Component({
  selector: 'app-carte-images',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './carte-images.html',
  styleUrl: './carte-images.scss',
})
export class CarteImages implements OnInit, OnDestroy {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly platId = input.required<number>();

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly images = signal<ImagePlatCarte[]>([]);

  readonly fichierSelectionne = signal<File | null>(null);
  readonly apercuSelection = signal<string | null>(null);
  readonly estPrincipaleSelection = signal(false);
  readonly envoiEnCours = signal(false);

  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly changementPrincipaleEnCoursId = signal<number | null>(null);
  readonly reordonnancementEnCours = signal(false);

  readonly messageErreur = signal<string | null>(null);

  readonly imagesOrdonnees = computed(() => [...this.images()].sort((a, b) => a.ordre - b.ordre));

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerImagesPlat(this.prefixe(), this.platId()).subscribe({
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
    if (!fichier) return;

    this.messageErreur.set(null);
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
    this.estPrincipaleSelection.set(this.images().length === 0);
  }

  annulerSelection(): void {
    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
    this.fichierSelectionne.set(null);
    this.apercuSelection.set(null);
  }

  ajouterImage(): void {
    const fichier = this.fichierSelectionne();
    if (!fichier || this.envoiEnCours()) return;

    this.envoiEnCours.set(true);
    this.messageErreur.set(null);

    this.service
      .ajouterImagePlat(this.prefixe(), this.platId(), fichier, { estPrincipale: this.estPrincipaleSelection() })
      .subscribe({
        next: (image) => {
          this.envoiEnCours.set(false);
          this.images.update((liste) => [...liste, image]);
          this.annulerSelection();
        },
        error: (erreur: unknown) => {
          this.envoiEnCours.set(false);
          this.messageErreur.set(extraireMessageErreur(erreur));
        },
      });
  }

  supprimerImage(image: ImagePlatCarte): void {
    if (this.suppressionEnCoursId()) return;
    this.suppressionEnCoursId.set(image.id);
    this.messageErreur.set(null);

    this.service.supprimerImagePlat(this.prefixe(), this.platId(), image.id).subscribe({
      next: () => {
        this.suppressionEnCoursId.set(null);
        this.images.update((liste) => liste.filter((i) => i.id !== image.id));
      },
      error: (erreur: unknown) => {
        this.suppressionEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  definirPrincipale(image: ImagePlatCarte): void {
    if (image.est_principale || this.changementPrincipaleEnCoursId()) return;
    const ancienne = this.images().find((i) => i.est_principale) ?? null;
    this.changementPrincipaleEnCoursId.set(image.id);
    this.messageErreur.set(null);

    const retirerAncienne$: Observable<ImagePlatCarte | null> = ancienne
      ? this.service.definirImagePrincipale(this.prefixe(), this.platId(), ancienne.id, false)
      : of(null);

    retirerAncienne$
      .pipe(switchMap(() => this.service.definirImagePrincipale(this.prefixe(), this.platId(), image.id, true)))
      .subscribe({
        next: () => {
          this.changementPrincipaleEnCoursId.set(null);
          this.charger();
        },
        error: (erreur: unknown) => {
          this.changementPrincipaleEnCoursId.set(null);
          this.messageErreur.set(extraireMessageErreur(erreur));
          this.charger();
        },
      });
  }

  surDepot(evenement: CdkDragDrop<ImagePlatCarte[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) return;

    const reordonnees = [...this.imagesOrdonnees()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);

    const aPatcher: { id: number; ordre: number }[] = [];
    const nouvelleListe = reordonnees.map((image, index) => {
      if (image.ordre === index) return image;
      aPatcher.push({ id: image.id, ordre: index });
      return { ...image, ordre: index };
    });

    // Retour visuel immédiat pendant la persistance en arrière-plan.
    this.images.set(nouvelleListe);
    if (aPatcher.length === 0) return;

    this.reordonnancementEnCours.set(true);
    this.messageErreur.set(null);
    forkJoin(
      aPatcher.map((p) => this.service.definirOrdreImagePlat(this.prefixe(), this.platId(), p.id, p.ordre)),
    ).subscribe({
      next: () => this.reordonnancementEnCours.set(false),
      error: (erreur: unknown) => {
        this.reordonnancementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }
}

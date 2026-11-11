import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { RestaurantService, PrefixeRestaurant } from '../../restaurant.service';
import { ImagePlatCarte } from '../../../../modeles/carte-restaurant.model';
import { extraireMessageErreur } from '../../extraire-message-erreur';
import { AjoutPhotos, TeleverserPhoto } from '../../../../partage/ajout-photos/ajout-photos';

/**
 * Gestion des images d'un plat de carte restaurant : liste, ajout de plusieurs photos jusqu'au
 * plafond (AjoutPhotos, compteur « n / max »), image principale et glisser-déposer pour l'ordre —
 * même logique que GestionImages (catalogue), adaptée au RestaurantService paramétré par préfixe
 * (utilisé par le partenaire et par l'admin à sa place).
 */
@Component({
  selector: 'app-carte-images',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, AjoutPhotos],
  templateUrl: './carte-images.html',
  styleUrl: './carte-images.scss',
})
export class CarteImages implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly platId = input.required<number>();
  /** Plafond effectif de photos renvoyé par le serveur (null = aucun plafond connu, comme avant). */
  readonly plafond = input<number | null>(null);

  /** Envoi d'une photo du plat, utilisé par AjoutPhotos. */
  readonly televerser: TeleverserPhoto = (fichier, estPrincipale) =>
    this.service.ajouterImagePlat(this.prefixe(), this.platId(), fichier, { estPrincipale });

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly images = signal<ImagePlatCarte[]>([]);

  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly changementPrincipaleEnCoursId = signal<number | null>(null);
  readonly reordonnancementEnCours = signal(false);

  readonly messageErreur = signal<string | null>(null);

  readonly imagesOrdonnees = computed(() => [...this.images()].sort((a, b) => a.ordre - b.ordre));

  ngOnInit(): void {
    this.charger();
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

  surPhotoAjoutee(image: unknown): void {
    this.messageErreur.set(null);
    this.images.update((liste) => [...liste, image as ImagePlatCarte]);
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

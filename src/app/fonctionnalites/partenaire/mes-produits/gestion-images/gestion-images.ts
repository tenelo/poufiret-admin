import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { MesProduitsService } from '../mes-produits.service';
import { ImageArticle, PlafondPhotosArticle } from '../../../../modeles/image-article.model';
import { extraireMessageErreur } from '../extraire-message-erreur';
import { AjoutPhotos, TeleverserPhoto } from '../../../../partage/ajout-photos/ajout-photos';

/**
 * Gestion des images d'un article (catalogue partenaire), affichée en overlay par le
 * composant parent : liste, ajout de plusieurs photos jusqu'au plafond (AjoutPhotos, compteur
 * « n / max »), image principale, ordre par glisser-déposer et suppression.
 */
@Component({
  selector: 'app-gestion-images',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, AjoutPhotos],
  templateUrl: './gestion-images.html',
  styleUrl: './gestion-images.scss',
})
export class GestionImages implements OnInit {
  private readonly mesProduitsService = inject(MesProduitsService);

  readonly articleId = input.required<number>();
  readonly nomArticle = input('');
  /** Repli : quota du forfait, utilisé seulement si la réponse de la liste d'images n'expose
   *  pas plafond_photos (voir `plafondPhotos` et `plafond`). */
  readonly quotaMax = input(Infinity);

  readonly ferme = output<void>();

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly images = signal<ImageArticle[]>([]);
  /** Plafond lu dans la réponse de la liste (plafond_photos) ; null si absent de la réponse. */
  readonly plafondPhotos = signal<PlafondPhotosArticle | null>(null);

  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly imageAConfirmerSuppression = signal<ImageArticle | null>(null);

  readonly changementPrincipaleEnCoursId = signal<number | null>(null);

  readonly reordonnancementEnCours = signal(false);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  /**
   * Plafond transmis à AjoutPhotos : plafond_photos.max si la réponse de la liste l'expose
   * (null = illimité, transmis tel quel), sinon le repli historique sur le quota du forfait
   * (`quotaMax`, null si infini c.-à-d. aucun plafond connu).
   */
  readonly plafond = computed(() => {
    const plafondPhotos = this.plafondPhotos();
    if (plafondPhotos) {
      return plafondPhotos.max;
    }
    return Number.isFinite(this.quotaMax()) ? this.quotaMax() : null;
  });

  /** Envoi d'une photo (POST /catalogue/images/), utilisé par AjoutPhotos. */
  readonly televerser: TeleverserPhoto = (fichier, estPrincipale) =>
    this.mesProduitsService.ajouterImage(this.articleId(), fichier, { estPrincipale });

  // Ordre d'affichage piloté uniquement par `ordre` (glisser-déposer) — jamais
  // par `est_principale`, qui reste un statut indépendant (badge seulement,
  // ne bouscule plus l'ordre des autres images).
  readonly imagesOrdonnees = computed(() => [...this.images()].sort((a, b) => a.ordre - b.ordre));

  ngOnInit(): void {
    this.chargerImages();
  }

  chargerImages(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.mesProduitsService.listerImages(this.articleId()).subscribe({
      next: ({ images, plafond }) => {
        this.chargementEnCours.set(false);
        this.images.set(images);
        this.plafondPhotos.set(plafond);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  surPhotoAjoutee(image: unknown): void {
    this.messageErreur.set(null);
    this.images.update((liste) => [...liste, image as ImageArticle]);
  }

  surAjoutTermine(nombre: number): void {
    this.messageSucces.set(nombre > 1 ? `${nombre} images ajoutées avec succès.` : 'Image ajoutée avec succès.');
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
        this.imageAConfirmerSuppression.set(null);
        const restantes = this.images()
          .filter((i) => i.id !== image.id)
          .sort((a, b) => a.ordre - b.ordre);
        this.images.set(restantes);

        // Garde-fou : si l'image supprimée était la principale et qu'il en reste
        // d'autres, on désigne automatiquement la première (par ordre d'affichage)
        // comme principale plutôt que de laisser l'article sans image de couverture.
        if (image.est_principale && restantes.length > 0) {
          this.mesProduitsService.definirEstPrincipale(restantes[0].id, true).subscribe({
            next: (imageMaj) => {
              this.suppressionEnCoursId.set(null);
              this.images.update((liste) => liste.map((i) => (i.id === imageMaj.id ? imageMaj : i)));
              this.messageSucces.set(
                'Image supprimée avec succès. Une nouvelle image principale a été désignée automatiquement.',
              );
            },
            error: (erreur: unknown) => {
              this.suppressionEnCoursId.set(null);
              this.messageErreur.set(extraireMessageErreur(erreur));
            },
          });
        } else {
          this.suppressionEnCoursId.set(null);
          this.messageSucces.set('Image supprimée avec succès.');
        }
      },
      error: (erreur: unknown) => {
        this.suppressionEnCoursId.set(null);
        this.imageAConfirmerSuppression.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  /**
   * Désigne l'image comme principale : retire d'abord le statut de l'ancienne
   * (le backend ne garantit pas forcément l'unicité sur un simple PATCH), puis
   * le pose sur la nouvelle, avant de rafraîchir la liste.
   */
  definirPrincipale(image: ImageArticle): void {
    if (image.est_principale || this.changementPrincipaleEnCoursId()) {
      return;
    }

    const ancienne = this.images().find((i) => i.est_principale) ?? null;
    this.changementPrincipaleEnCoursId.set(image.id);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    const retirerAncienne$: Observable<ImageArticle | null> = ancienne
      ? this.mesProduitsService.definirEstPrincipale(ancienne.id, false)
      : of(null);

    retirerAncienne$.pipe(switchMap(() => this.mesProduitsService.definirEstPrincipale(image.id, true))).subscribe({
      next: () => {
        this.changementPrincipaleEnCoursId.set(null);
        this.messageSucces.set('Image principale mise à jour avec succès.');
        this.chargerImages();
      },
      error: (erreur: unknown) => {
        this.changementPrincipaleEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
        // Recharge quand même : si l'ancienne a été retirée avant l'échec de
        // la nouvelle, l'état affiché doit refléter la réalité côté serveur.
        this.chargerImages();
      },
    });
  }

  /**
   * Glisser-déposer : recalcule `ordre` = position dans la nouvelle liste,
   * applique un état local optimiste immédiatement, puis ne persiste (PATCH)
   * que les images dont l'ordre a réellement changé. N'affecte jamais
   * `est_principale` (statut indépendant de l'ordre).
   */
  surDepot(evenement: CdkDragDrop<ImageArticle[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }

    const reordonnees = [...this.imagesOrdonnees()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);

    const aPatcher: { id: number; ordre: number }[] = [];
    const nouvelleListe = reordonnees.map((image, index) => {
      if (image.ordre === index) {
        return image;
      }
      aPatcher.push({ id: image.id, ordre: index });
      return { ...image, ordre: index };
    });

    // Retour visuel immédiat pendant la persistance en arrière-plan.
    this.images.set(nouvelleListe);

    if (aPatcher.length === 0) {
      return;
    }
    this.persisterOrdre(aPatcher);
  }

  private persisterOrdre(aPatcher: { id: number; ordre: number }[]): void {
    this.reordonnancementEnCours.set(true);
    this.messageErreur.set(null);

    forkJoin(aPatcher.map((p) => this.mesProduitsService.definirOrdre(p.id, p.ordre))).subscribe({
      next: () => {
        this.reordonnancementEnCours.set(false);
      },
      error: (erreur: unknown) => {
        this.reordonnancementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
        // Resynchronise avec l'état réel côté serveur en cas d'échec partiel.
        this.chargerImages();
      },
    });
  }
}

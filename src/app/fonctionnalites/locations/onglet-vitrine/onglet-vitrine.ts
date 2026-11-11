import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { LocationService, PrefixeLocation } from '../location.service';
import { ChoisirPhotoVitrine } from './choisir-photo-vitrine/choisir-photo-vitrine';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ImageVitrine, PhotoDisponibleVitrine, Vitrine } from '../../../modeles/vitrine-etablissement.model';

const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Vitrine d'un hôtel/résidence (GET/POST/PATCH/DELETE P/vitrine/, réordonnée en un seul appel
 * P/vitrine/ordre/) : courte liste ordonnée d'images alimentant le carrousel de la fiche
 * établissement dans l'app. Onglet de l'espace loueur (voir EspaceLoueur), paramétré par préfixe
 * comme les autres onglets. Réordonnancement : même pattern que CategoriesAdmin.reordonnerGroupe
 * (mise à jour optimiste locale + un seul appel, recharge si le backend refuse).
 */
@Component({
  selector: 'app-onglet-vitrine',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, ChoisirPhotoVitrine],
  templateUrl: './onglet-vitrine.html',
  styleUrl: './onglet-vitrine.scss',
})
export class OngletVitrine implements OnInit, OnDestroy {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();

  readonly vitrine = signal<Vitrine | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly imagesOrdonnees = computed(() => [...(this.vitrine()?.images ?? [])].sort((a, b) => a.ordre - b.ordre));
  readonly vitrinePleine = computed(() => {
    const v = this.vitrine();
    return !!v && v.nb_images >= v.nb_max_images;
  });
  /** Le max a été réduit après coup : seules les premières images (dans l'ordre) sont affichées. */
  readonly depasseLeMax = computed(() => {
    const v = this.vitrine();
    return !!v && v.nb_images > v.nb_max_images;
  });

  readonly legendesEnEdition = signal<Record<string, string>>({});
  readonly enregistrementLegendeEnCoursId = signal<string | null>(null);

  readonly imageAConfirmerRetrait = signal<ImageVitrine | null>(null);
  readonly retraitEnCours = signal(false);
  readonly reordonnancementEnCours = signal(false);

  readonly pickerOuvert = signal(false);
  readonly ajoutExistanteEnCoursId = signal<number | null>(null);

  readonly fichierSelectionne = signal<File | null>(null);
  readonly apercuSelection = signal<string | null>(null);
  readonly legendeSelection = signal('');
  readonly envoiEnCours = signal(false);

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.apercuSelection()) {
      URL.revokeObjectURL(this.apercuSelection()!);
    }
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.obtenirVitrine(this.prefixe()).subscribe({
      next: (vitrine) => {
        this.chargementEnCours.set(false);
        this.appliquer(vitrine);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private appliquer(vitrine: Vitrine): void {
    this.vitrine.set(vitrine);
    this.legendesEnEdition.set(Object.fromEntries(vitrine.images.map((i) => [i.id, i.legende ?? ''])));
  }

  // ---- Légende ----

  texteLegende(image: ImageVitrine): string {
    return this.legendesEnEdition()[image.id] ?? '';
  }

  changerTexteLegende(image: ImageVitrine, valeur: string): void {
    this.legendesEnEdition.update((map) => ({ ...map, [image.id]: valeur }));
  }

  enregistrerLegende(image: ImageVitrine): void {
    const legende = this.texteLegende(image).trim();
    if (legende === (image.legende ?? '') || this.enregistrementLegendeEnCoursId()) {
      return;
    }
    this.enregistrementLegendeEnCoursId.set(image.id);
    this.messageErreur.set(null);

    this.service.modifierLegendeVitrine(this.prefixe(), image.id, legende).subscribe({
      next: (vitrine) => {
        this.enregistrementLegendeEnCoursId.set(null);
        this.appliquer(vitrine);
      },
      error: (erreur: unknown) => {
        this.enregistrementLegendeEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Retrait ----

  demanderRetrait(image: ImageVitrine): void {
    this.imageAConfirmerRetrait.set(image);
  }

  annulerRetrait(): void {
    this.imageAConfirmerRetrait.set(null);
  }

  confirmerRetrait(): void {
    const image = this.imageAConfirmerRetrait();
    if (!image || this.retraitEnCours()) {
      return;
    }
    this.retraitEnCours.set(true);
    this.messageErreur.set(null);

    this.service.retirerImageVitrine(this.prefixe(), image.id).subscribe({
      next: (vitrine) => {
        this.retraitEnCours.set(false);
        this.imageAConfirmerRetrait.set(null);
        this.appliquer(vitrine);
        this.messageSucces.set('Image retirée de la vitrine.');
      },
      error: (erreur: unknown) => {
        this.retraitEnCours.set(false);
        this.imageAConfirmerRetrait.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Réordonnancement (un seul appel P/vitrine/ordre/) ----

  surDepot(evenement: CdkDragDrop<ImageVitrine[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) {
      return;
    }
    const reordonnees = [...this.imagesOrdonnees()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);

    // Retour visuel immédiat pendant la persistance en arrière-plan.
    const vitrineActuelle = this.vitrine();
    if (vitrineActuelle) {
      this.vitrine.set({
        ...vitrineActuelle,
        images: reordonnees.map((image, index) => ({ ...image, ordre: index })),
      });
    }

    this.reordonnancementEnCours.set(true);
    this.messageErreur.set(null);
    this.service.reordonnerVitrine(this.prefixe(), reordonnees.map((i) => i.id)).subscribe({
      next: (vitrine) => {
        this.reordonnancementEnCours.set(false);
        this.appliquer(vitrine);
      },
      error: (erreur: unknown) => {
        this.reordonnancementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }

  // ---- Ajout : choisir parmi mes photos ----

  ouvrirPicker(): void {
    if (this.vitrinePleine()) {
      return;
    }
    this.pickerOuvert.set(true);
  }

  fermerPicker(): void {
    this.pickerOuvert.set(false);
  }

  ajouterPhotoExistante(photo: PhotoDisponibleVitrine): void {
    if (this.ajoutExistanteEnCoursId()) {
      return;
    }
    this.ajoutExistanteEnCoursId.set(photo.id);
    this.messageErreur.set(null);

    this.service.ajouterImageVitrineExistante(this.prefixe(), photo.id).subscribe({
      next: (vitrine) => {
        this.ajoutExistanteEnCoursId.set(null);
        this.pickerOuvert.set(false);
        this.appliquer(vitrine);
        this.messageSucces.set('Photo ajoutée à la vitrine.');
      },
      error: (erreur: unknown) => {
        this.ajoutExistanteEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Ajout : photo propre de l'établissement ----

  selectionnerFichier(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';
    if (!fichier) {
      return;
    }

    this.messageErreur.set(null);
    if (!fichier.type.startsWith('image/')) {
      this.messageErreur.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.messageErreur.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    if (this.apercuSelection()) {
      URL.revokeObjectURL(this.apercuSelection()!);
    }
    this.fichierSelectionne.set(fichier);
    this.apercuSelection.set(URL.createObjectURL(fichier));
    this.legendeSelection.set('');
  }

  changerLegendeSelection(valeur: string): void {
    this.legendeSelection.set(valeur);
  }

  annulerSelectionFichier(): void {
    if (this.apercuSelection()) {
      URL.revokeObjectURL(this.apercuSelection()!);
    }
    this.fichierSelectionne.set(null);
    this.apercuSelection.set(null);
    this.legendeSelection.set('');
  }

  ajouterPhotoPropre(): void {
    const fichier = this.fichierSelectionne();
    if (!fichier || this.envoiEnCours() || this.vitrinePleine()) {
      return;
    }
    this.envoiEnCours.set(true);
    this.messageErreur.set(null);

    this.service.ajouterImageVitrinePropre(this.prefixe(), fichier, this.legendeSelection().trim() || undefined).subscribe({
      next: (vitrine) => {
        this.envoiEnCours.set(false);
        this.appliquer(vitrine);
        this.annulerSelectionFichier();
        this.messageSucces.set('Photo ajoutée à la vitrine.');
      },
      error: (erreur: unknown) => {
        this.envoiEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

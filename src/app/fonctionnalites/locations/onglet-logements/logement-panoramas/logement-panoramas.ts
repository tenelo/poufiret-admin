import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';

import { LocationService, PrefixeLocation, RessourceLocation } from '../../location.service';
import { PanoramaLogement, TypeVuePanorama } from '../../../../modeles/logement.model';
import { extraireMessageErreur } from '../../../administration/tableau-de-bord-admin/extraire-message-erreur';

const TAILLE_MAX_IMAGE_OCTETS = 8 * 1024 * 1024;

export const OPTIONS_TYPE_VUE: { valeur: TypeVuePanorama; libelle: string }[] = [
  { valeur: 'photo_360', libelle: 'Photo 360°' },
  { valeur: 'panoramique', libelle: 'Panoramique' },
];

/**
 * Visite immersive d'un logement : panoramas avec titre (« Salon », « Chambre 1 »…), type de vue
 * et ordre (glisser-déposer) — même structure que LogementImages, avec les champs titre/type_vue
 * en plus à l'ajout.
 */
@Component({
  selector: 'app-logement-panoramas',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './logement-panoramas.html',
  styleUrl: './logement-panoramas.scss',
})
export class LogementPanoramas implements OnInit, OnDestroy {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();
  /** Id du logement ou du véhicule (voir `ressource`). */
  readonly logementId = input.required<number>();
  /** Réutilisé tel quel pour les véhicules : seule la ressource de l'URL change. */
  readonly ressource = input<RessourceLocation>('logements');

  readonly optionsTypeVue = OPTIONS_TYPE_VUE;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly panoramas = signal<PanoramaLogement[]>([]);

  readonly fichierSelectionne = signal<File | null>(null);
  readonly apercuSelection = signal<string | null>(null);
  readonly titreSelection = signal('');
  readonly typeVueSelection = signal<TypeVuePanorama>('photo_360');
  readonly envoiEnCours = signal(false);

  readonly suppressionEnCoursId = signal<number | null>(null);
  readonly reordonnancementEnCours = signal(false);

  readonly messageErreur = signal<string | null>(null);

  readonly panoramasOrdonnes = computed(() => [...this.panoramas()].sort((a, b) => a.ordre - b.ordre));

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerPanoramas(this.prefixe(), this.logementId(), this.ressource()).subscribe({
      next: (panoramas) => {
        this.chargementEnCours.set(false);
        this.panoramas.set(panoramas);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerTitreSelection(valeur: string): void {
    this.titreSelection.set(valeur);
  }

  changerTypeVueSelection(valeur: string): void {
    this.typeVueSelection.set(valeur as TypeVuePanorama);
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
      this.messageErreur.set("L'image ne doit pas dépasser 8 Mo.");
      return;
    }

    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
    this.fichierSelectionne.set(fichier);
    this.apercuSelection.set(URL.createObjectURL(fichier));
  }

  annulerSelection(): void {
    if (this.apercuSelection()) URL.revokeObjectURL(this.apercuSelection()!);
    this.fichierSelectionne.set(null);
    this.apercuSelection.set(null);
    this.titreSelection.set('');
  }

  ajouterPanorama(): void {
    const fichier = this.fichierSelectionne();
    const titre = this.titreSelection().trim();
    if (!fichier || !titre || this.envoiEnCours()) {
      if (!titre) {
        this.messageErreur.set('Le titre est requis (ex. « Salon »).');
      }
      return;
    }

    this.envoiEnCours.set(true);
    this.messageErreur.set(null);

    this.service
      .ajouterPanorama(
        this.prefixe(),
        this.logementId(),
        fichier,
        {
          titre,
          type_vue: this.typeVueSelection(),
        },
        this.ressource(),
      )
      .subscribe({
        next: (panorama) => {
          this.envoiEnCours.set(false);
          this.panoramas.update((liste) => [...liste, panorama]);
          this.annulerSelection();
        },
        error: (erreur: unknown) => {
          this.envoiEnCours.set(false);
          this.messageErreur.set(extraireMessageErreur(erreur));
        },
      });
  }

  supprimerPanorama(panorama: PanoramaLogement): void {
    if (this.suppressionEnCoursId()) return;
    this.suppressionEnCoursId.set(panorama.id);
    this.messageErreur.set(null);

    this.service.supprimerPanorama(this.prefixe(), this.logementId(), panorama.id, this.ressource()).subscribe({
      next: () => {
        this.suppressionEnCoursId.set(null);
        this.panoramas.update((liste) => liste.filter((p) => p.id !== panorama.id));
      },
      error: (erreur: unknown) => {
        this.suppressionEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  libelleTypeVue(typeVue: TypeVuePanorama): string {
    return this.optionsTypeVue.find((o) => o.valeur === typeVue)?.libelle ?? typeVue;
  }

  surDepot(evenement: CdkDragDrop<PanoramaLogement[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) return;

    const reordonnes = [...this.panoramasOrdonnes()];
    moveItemInArray(reordonnes, evenement.previousIndex, evenement.currentIndex);

    const aPatcher: { id: number; ordre: number }[] = [];
    const nouvelleListe = reordonnes.map((panorama, index) => {
      if (panorama.ordre === index) return panorama;
      aPatcher.push({ id: panorama.id, ordre: index });
      return { ...panorama, ordre: index };
    });

    this.panoramas.set(nouvelleListe);
    if (aPatcher.length === 0) return;

    this.reordonnancementEnCours.set(true);
    this.messageErreur.set(null);
    forkJoin(
      aPatcher.map((p) =>
        this.service.modifierPanorama(this.prefixe(), this.logementId(), p.id, { ordre: p.ordre }, this.ressource()),
      ),
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

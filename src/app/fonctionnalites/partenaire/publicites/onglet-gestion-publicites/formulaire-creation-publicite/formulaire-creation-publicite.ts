import { Component, computed, input, output, signal } from '@angular/core';

import {
  FormulePublicite,
  OPTIONS_PORTEE,
  PorteePublicite,
  RequeteCreationPublicite,
} from '../../../../../modeles/publicite.model';

// Taille max acceptée côté client pour l'image de couverture.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Formulaire de création d'une campagne publicitaire (statut initial : brouillon),
 * affiché en overlay par l'onglet "Gérer mes publicités".
 */
@Component({
  selector: 'app-formulaire-creation-publicite',
  imports: [],
  templateUrl: './formulaire-creation-publicite.html',
  styleUrl: './formulaire-creation-publicite.scss',
})
export class FormulaireCreationPublicite {
  readonly formules = input.required<FormulePublicite[]>();
  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly soumis = output<RequeteCreationPublicite>();
  readonly annule = output<void>();

  readonly optionsPortee = OPTIONS_PORTEE;

  readonly formuleId = signal<number | null>(null);
  readonly titre = signal('');
  readonly description = signal('');
  readonly portee = signal<PorteePublicite>('departement');

  readonly fichierImage = signal<File | null>(null);
  readonly apercuImage = signal<string | null>(null);
  readonly fichierVideo = signal<File | null>(null);

  readonly touche = signal(false);
  readonly messageErreurValidation = signal<string | null>(null);

  readonly formuleSelectionnee = computed(
    () => this.formules().find((f) => f.id === this.formuleId()) ?? null,
  );
  readonly videoAutorisee = computed(() => this.formuleSelectionnee()?.video_autorisee ?? false);

  selectionnerFormule(valeur: string): void {
    const id = valeur ? Number(valeur) : null;
    this.formuleId.set(id);
    const formule = this.formules().find((f) => f.id === id);
    if (!formule?.video_autorisee) {
      this.retirerVideo();
    }
  }

  selectionnerImage(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';
    if (!fichier) return;

    this.messageErreurValidation.set(null);

    if (!fichier.type.startsWith('image/')) {
      this.messageErreurValidation.set("L'image de couverture doit être un fichier image.");
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.messageErreurValidation.set("L'image de couverture ne doit pas dépasser 5 Mo.");
      return;
    }

    if (this.apercuImage()) URL.revokeObjectURL(this.apercuImage()!);
    this.fichierImage.set(fichier);
    this.apercuImage.set(URL.createObjectURL(fichier));
  }

  retirerImage(): void {
    if (this.apercuImage()) URL.revokeObjectURL(this.apercuImage()!);
    this.fichierImage.set(null);
    this.apercuImage.set(null);
  }

  selectionnerVideo(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';
    if (!fichier) return;

    this.messageErreurValidation.set(null);

    if (!fichier.type.startsWith('video/')) {
      this.messageErreurValidation.set('Le fichier vidéo doit être une vidéo.');
      return;
    }
    this.fichierVideo.set(fichier);
  }

  retirerVideo(): void {
    this.fichierVideo.set(null);
  }

  soumettre(): void {
    this.touche.set(true);

    if (!this.formuleId()) {
      this.messageErreurValidation.set('Choisissez une formule.');
      return;
    }
    if (!this.titre().trim()) {
      this.messageErreurValidation.set('Le titre est requis.');
      return;
    }
    if (!this.fichierImage()) {
      this.messageErreurValidation.set("L'image de couverture est requise.");
      return;
    }

    this.messageErreurValidation.set(null);

    const donnees: RequeteCreationPublicite = {
      formule: this.formuleId()!,
      titre: this.titre().trim(),
      description: this.description().trim() || undefined,
      imageCouverture: this.fichierImage()!,
      video: this.fichierVideo() ?? undefined,
      portee: this.portee(),
    };
    this.soumis.emit(donnees);
  }
}

import { Component, OnDestroy, effect, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { LIBELLES_STATUT_PUBLICITE, MaPublicite } from '../../../../../modeles/publicite.model';

// Taille max acceptée côté client pour une image de campagne.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Détail d'une campagne, ouvert au clic sur sa carte dans l'onglet "Gérer mes
 * publicités" : informations en lecture seule + remplacement de l'image de
 * couverture (avec confirmation explicite si la campagne est active, car le
 * backend la repasse alors en validation admin).
 */
@Component({
  selector: 'app-dialog-detail-publicite',
  imports: [DatePipe],
  templateUrl: './dialog-detail-publicite.html',
  styleUrl: './dialog-detail-publicite.scss',
})
export class DialogDetailPublicite implements OnDestroy {
  readonly publicite = input.required<MaPublicite>();
  readonly libelleFormule = input.required<string>();
  readonly envoiImageEnCours = input(false);
  readonly erreurImage = input<string | null>(null);

  readonly ferme = output<void>();
  readonly imageModifiee = output<File>();
  readonly supprimer = output<void>();

  readonly libellesStatut = LIBELLES_STATUT_PUBLICITE;

  readonly nouvelleImage = signal<File | null>(null);
  readonly apercuNouvelleImage = signal<string | null>(null);
  readonly erreurLocaleImage = signal<string | null>(null);
  readonly confirmationActiveOuverte = signal(false);

  constructor() {
    // La campagne détaillée change de référence quand le parent applique une
    // mise à jour réussie (nouvelle image) : on efface alors la sélection en
    // attente pour revenir à l'état "consulter", plutôt que de la laisser
    // affichée par-dessus l'image déjà à jour.
    effect(() => {
      this.publicite();
      this.annulerNouvelleImage();
    });
  }

  ngOnDestroy(): void {
    if (this.apercuNouvelleImage()) {
      URL.revokeObjectURL(this.apercuNouvelleImage()!);
    }
  }

  selectionnerNouvelleImage(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';

    if (!fichier) {
      return;
    }

    this.erreurLocaleImage.set(null);

    if (!fichier.type.startsWith('image/')) {
      this.erreurLocaleImage.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.erreurLocaleImage.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    if (this.apercuNouvelleImage()) {
      URL.revokeObjectURL(this.apercuNouvelleImage()!);
    }
    this.nouvelleImage.set(fichier);
    this.apercuNouvelleImage.set(URL.createObjectURL(fichier));
  }

  annulerNouvelleImage(): void {
    if (this.apercuNouvelleImage()) {
      URL.revokeObjectURL(this.apercuNouvelleImage()!);
    }
    this.nouvelleImage.set(null);
    this.apercuNouvelleImage.set(null);
    this.confirmationActiveOuverte.set(false);
  }

  /** Déclenché par "Envoyer la nouvelle image" : demande confirmation si la campagne est active. */
  demanderEnvoiImage(): void {
    if (!this.nouvelleImage()) {
      return;
    }
    if (this.publicite().statut === 'active') {
      this.confirmationActiveOuverte.set(true);
      return;
    }
    this.envoyerImage();
  }

  annulerConfirmationActive(): void {
    this.confirmationActiveOuverte.set(false);
  }

  confirmerEnvoiImageActive(): void {
    this.confirmationActiveOuverte.set(false);
    this.envoyerImage();
  }

  private envoyerImage(): void {
    const fichier = this.nouvelleImage();
    if (!fichier) {
      return;
    }
    this.imageModifiee.emit(fichier);
  }
}

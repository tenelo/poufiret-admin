import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';

import { FormulePublicite, MaPublicite } from '../../../../../modeles/publicite.model';

// Taille max acceptée côté client pour une image de campagne.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

export interface DonneesReconduction {
  formuleId: number;
  image?: File;
}

/**
 * Dialog de reconduction d'une campagne terminée : formule pré-remplie avec
 * celle de la campagne d'origine (modifiable), et image de couverture
 * optionnelle (sinon l'ancienne est reprise par le backend). Ne fait pas
 * l'appel réseau : émet les données choisies, le parent gère l'appel + le
 * message de succès.
 */
@Component({
  selector: 'app-dialog-reconduction',
  imports: [],
  templateUrl: './dialog-reconduction.html',
  styleUrl: './dialog-reconduction.scss',
})
export class DialogReconduction implements OnDestroy {
  readonly publicite = input.required<MaPublicite>();
  readonly formules = input.required<FormulePublicite[]>();
  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly soumis = output<DonneesReconduction>();
  readonly annule = output<void>();

  // Tant que l'utilisateur n'a rien choisi explicitement, on retombe sur la
  // formule de la campagne d'origine (pré-remplissage demandé).
  private readonly formuleIdChoisie = signal<number | null>(null);
  readonly formuleId = computed(() => this.formuleIdChoisie() ?? this.publicite().formule);

  readonly formuleSelectionnee = computed(
    () => this.formules().find((f) => f.id === this.formuleId()) ?? null,
  );

  readonly nouvelleImage = signal<File | null>(null);
  readonly apercuNouvelleImage = signal<string | null>(null);
  readonly erreurLocaleImage = signal<string | null>(null);

  ngOnDestroy(): void {
    if (this.apercuNouvelleImage()) {
      URL.revokeObjectURL(this.apercuNouvelleImage()!);
    }
  }

  selectionnerFormule(valeur: string): void {
    this.formuleIdChoisie.set(valeur ? Number(valeur) : null);
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
  }

  soumettre(): void {
    if (!this.formuleId() || this.enregistrementEnCours()) {
      return;
    }
    const image = this.nouvelleImage();
    this.soumis.emit(image ? { formuleId: this.formuleId()!, image } : { formuleId: this.formuleId()! });
  }
}

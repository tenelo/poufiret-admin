import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ProfilPartenaireService } from './profil-partenaire.service';
import {
  OPTIONS_TYPE_PARTENAIRE,
  ProfilPartenaire,
  RequeteMiseAJourProfilPartenaire,
} from '../../../modeles/profil-partenaire.model';

// Taille max acceptée côté client pour le logo / la photo de couverture.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

type ChampImage = 'logo' | 'photo_couverture';

/**
 * Page "Mon profil" de l'espace partenaire : consultation et modification
 * des informations de la vitrine (GET/PATCH /auth/mon-profil-partenaire/).
 */
@Component({
  selector: 'app-mon-profil',
  imports: [ReactiveFormsModule],
  templateUrl: './mon-profil.html',
  styleUrl: './mon-profil.scss',
})
export class MonProfil implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profilPartenaireService = inject(ProfilPartenaireService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly profil = signal<ProfilPartenaire | null>(null);

  // Aperçus locaux (URL.createObjectURL) des images sélectionnées mais pas encore envoyées.
  readonly apercuLogo = signal<string | null>(null);
  readonly apercuCouverture = signal<string | null>(null);
  private readonly fichierLogo = signal<File | null>(null);
  private readonly fichierCouverture = signal<File | null>(null);

  readonly televersementImagesEnCours = signal(false);
  readonly messageErreurImages = signal<string | null>(null);
  readonly messageSuccesImages = signal<string | null>(null);

  /** True si au moins une nouvelle image attend d'être envoyée. */
  get imagesModifiees(): boolean {
    return this.fichierLogo() !== null || this.fichierCouverture() !== null;
  }

  readonly optionsTypePartenaire = OPTIONS_TYPE_PARTENAIRE;

  readonly formulaire = this.formBuilder.nonNullable.group({
    nom_commerce: ['', [Validators.required]],
    description: [''],
    type_partenaire: ['', [Validators.required]],
    adresse: [''],
    quartier: [''],
    secteur: [''],
    ville: [''],
    description_acces: [''],
    telephone_pro: [''],
    whatsapp: [''],
    email_pro: ['', [Validators.email]],
  });

  ngOnInit(): void {
    this.chargerProfil();
  }

  ngOnDestroy(): void {
    this.revoquerApercus();
  }

  chargerProfil(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.profilPartenaireService.chargerProfil().subscribe({
      next: (profil) => {
        this.chargementEnCours.set(false);
        this.appliquerProfil(profil);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const donnees: RequeteMiseAJourProfilPartenaire = this.formulaire.getRawValue();

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.profilPartenaireService.modifierProfil(donnees).subscribe({
      next: (profil) => {
        this.enregistrementEnCours.set(false);
        this.appliquerProfil(profil);
        this.messageSucces.set('Profil mis à jour avec succès.');
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  /** Appelé lors du choix d'un fichier pour le logo ou la photo de couverture. */
  selectionnerImage(evenement: Event, champ: ChampImage): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = ''; // permet de resélectionner le même fichier plus tard

    if (!fichier) {
      return;
    }

    this.messageErreurImages.set(null);
    this.messageSuccesImages.set(null);

    if (!fichier.type.startsWith('image/')) {
      this.messageErreurImages.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.messageErreurImages.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const url = URL.createObjectURL(fichier);
    if (champ === 'logo') {
      if (this.apercuLogo()) URL.revokeObjectURL(this.apercuLogo()!);
      this.fichierLogo.set(fichier);
      this.apercuLogo.set(url);
    } else {
      if (this.apercuCouverture()) URL.revokeObjectURL(this.apercuCouverture()!);
      this.fichierCouverture.set(fichier);
      this.apercuCouverture.set(url);
    }
  }

  /** Envoie au backend le(s) fichier(s) sélectionné(s) pour le logo et/ou la couverture. */
  enregistrerImages(): void {
    if (!this.imagesModifiees || this.televersementImagesEnCours()) {
      return;
    }

    this.televersementImagesEnCours.set(true);
    this.messageErreurImages.set(null);
    this.messageSuccesImages.set(null);

    this.profilPartenaireService
      .televerserImagesProfil({
        logo: this.fichierLogo() ?? undefined,
        photoCouverture: this.fichierCouverture() ?? undefined,
      })
      .subscribe({
        next: (profil) => {
          this.televersementImagesEnCours.set(false);
          this.profil.set(profil);
          this.revoquerApercus();
          this.messageSuccesImages.set('Images mises à jour avec succès.');
        },
        error: (erreur: unknown) => {
          this.televersementImagesEnCours.set(false);
          this.messageErreurImages.set(this.extraireMessageErreur(erreur));
        },
      });
  }

  private revoquerApercus(): void {
    if (this.apercuLogo()) URL.revokeObjectURL(this.apercuLogo()!);
    if (this.apercuCouverture()) URL.revokeObjectURL(this.apercuCouverture()!);
    this.apercuLogo.set(null);
    this.apercuCouverture.set(null);
    this.fichierLogo.set(null);
    this.fichierCouverture.set(null);
  }

  /** Liste des options du sélecteur de type, en y ajoutant la valeur courante si elle est inconnue. */
  optionsAvecValeurCourante(valeurCourante: string): { valeur: string; libelle: string }[] {
    if (!valeurCourante || this.optionsTypePartenaire.some((o) => o.valeur === valeurCourante)) {
      return this.optionsTypePartenaire;
    }
    return [...this.optionsTypePartenaire, { valeur: valeurCourante, libelle: valeurCourante }];
  }

  private appliquerProfil(profil: ProfilPartenaire): void {
    this.profil.set(profil);
    this.formulaire.patchValue({
      nom_commerce: profil.nom_commerce,
      description: profil.description,
      type_partenaire: profil.type_partenaire,
      adresse: profil.adresse,
      quartier: profil.quartier,
      secteur: profil.secteur,
      ville: profil.ville,
      description_acces: profil.description_acces,
      telephone_pro: profil.telephone_pro,
      whatsapp: profil.whatsapp,
      email_pro: profil.email_pro,
    });
  }

  private extraireMessageErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      // status 0 : la requête n'a pas atteint le serveur (réseau coupé, ou requête
      // bloquée par le navigateur faute de headers CORS autorisant cette origine).
      if (erreur.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
      }

      const corps = erreur.error;
      // Une page d'erreur HTML (ex. 500 Django hors mode debug) n'est pas un
      // message affichable : on retombe sur le message générique dans ce cas.
      if (typeof corps === 'string' && !/^\s*<(!doctype|html)/i.test(corps)) {
        return corps;
      }
      // Format d'erreur du backend Poufiret : {erreur, code, message, details: {detail}}
      if (typeof corps?.message === 'string') {
        return corps.message;
      }
      if (typeof corps?.details?.detail === 'string') {
        return corps.details.detail;
      }
      if (typeof corps?.detail === 'string') {
        return corps.detail;
      }
      if (corps?.non_field_errors?.length) {
        return corps.non_field_errors[0];
      }
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  }
}

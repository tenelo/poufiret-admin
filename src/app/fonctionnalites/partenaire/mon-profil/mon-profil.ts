import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ProfilPartenaireService } from './profil-partenaire.service';
import {
  OPTIONS_TYPE_PARTENAIRE,
  ProfilPartenaire,
  RequeteMiseAJourProfilPartenaire,
} from '../../../modeles/profil-partenaire.model';

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
export class MonProfil implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profilPartenaireService = inject(ProfilPartenaireService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly profil = signal<ProfilPartenaire | null>(null);

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
      if (typeof corps === 'string') {
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

import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../noyau/auth/auth.service';
import { routeParEspace } from '../../../noyau/auth/route-par-espace';

/**
 * Page de connexion : téléphone + PIN à 4 chiffres.
 */
@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule],
  templateUrl: './connexion.html',
  styleUrl: './connexion.scss',
})
export class Connexion {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly enCours = signal(false);
  readonly messageErreur = signal<string | null>(null);

  readonly formulaire = this.formBuilder.nonNullable.group({
    telephone: ['', [Validators.required]],
    pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
  });

  soumettre(): void {
    if (this.formulaire.invalid || this.enCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const { telephone, pin } = this.formulaire.getRawValue();

    this.enCours.set(true);
    this.messageErreur.set(null);

    this.authService.connexion(telephone, pin).subscribe({
      next: (utilisateur) => {
        this.enCours.set(false);
        this.router.navigateByUrl(routeParEspace(utilisateur.espace));
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        this.messageErreur.set(this.extraireMessageErreur(erreur));
      },
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
    return 'Impossible de se connecter. Vérifiez vos identifiants et réessayez.';
  }
}

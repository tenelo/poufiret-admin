import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../noyau/auth/auth.service';

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
      next: () => {
        this.enCours.set(false);
        this.router.navigate(['/tableau-de-bord']);
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        this.messageErreur.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  private extraireMessageErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      const corps = erreur.error;
      if (typeof corps === 'string') {
        return corps;
      }
      if (corps?.detail) {
        return corps.detail;
      }
      if (corps?.non_field_errors?.length) {
        return corps.non_field_errors[0];
      }
    }
    return 'Impossible de se connecter. Vérifiez vos identifiants et réessayez.';
  }
}

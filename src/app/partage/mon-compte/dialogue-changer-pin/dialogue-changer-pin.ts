import { Component, inject, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../../noyau/auth/auth.service';
import { extraireMessageErreur } from '../../../fonctionnalites/partenaire/mes-produits/extraire-message-erreur';

function validateurQuatreChiffres(controle: AbstractControl): ValidationErrors | null {
  return /^\d{4}$/.test(controle.value ?? '') ? null : { format: true };
}

/** Cohérence entre les 3 champs : nouveau ≠ ancien, confirmation = nouveau. */
function validateurCoherence(groupe: AbstractControl): ValidationErrors | null {
  const ancien = groupe.get('ancien_pin')?.value;
  const nouveau = groupe.get('nouveau_pin')?.value;
  const confirmation = groupe.get('confirmation_pin')?.value;

  const erreurs: ValidationErrors = {};
  if (nouveau && confirmation && nouveau !== confirmation) {
    erreurs['confirmationDifferente'] = true;
  }
  if (ancien && nouveau && ancien === nouveau) {
    erreurs['nouveauIdentique'] = true;
  }
  return Object.keys(erreurs).length ? erreurs : null;
}

/**
 * Dialog de changement du PIN de connexion, ouvert depuis la section
 * "Sécurité" de CarteMonCompte (partagée partenaire/admin/super-admin).
 * Autonome : appelle directement AuthService.changerPin (qui remplace aussi
 * les jetons stockés, le mot de passe ayant changé).
 */
@Component({
  selector: 'app-dialogue-changer-pin',
  imports: [ReactiveFormsModule],
  templateUrl: './dialogue-changer-pin.html',
  styleUrl: './dialogue-changer-pin.scss',
})
export class DialogueChangerPin {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly ferme = output<void>();
  readonly succes = output<void>();

  readonly enregistrementEnCours = signal(false);
  // Erreur serveur (ex. "ancien PIN incorrect") : affichée sous le champ concerné.
  readonly erreurAncienPin = signal<string | null>(null);

  readonly formulaire = this.formBuilder.nonNullable.group(
    {
      ancien_pin: ['', [Validators.required, validateurQuatreChiffres]],
      nouveau_pin: ['', [Validators.required, validateurQuatreChiffres]],
      confirmation_pin: ['', [Validators.required, validateurQuatreChiffres]],
    },
    { validators: [validateurCoherence] },
  );

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const { ancien_pin, nouveau_pin } = this.formulaire.getRawValue();

    this.enregistrementEnCours.set(true);
    this.erreurAncienPin.set(null);

    this.authService.changerPin(ancien_pin, nouveau_pin).subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.succes.emit();
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.erreurAncienPin.set(extraireMessageErreur(erreur));
      },
    });
  }
}

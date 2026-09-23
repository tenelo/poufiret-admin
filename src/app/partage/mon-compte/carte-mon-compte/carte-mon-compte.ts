import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../noyau/auth/auth.service';
import { DialogueChangerPin } from '../dialogue-changer-pin/dialogue-changer-pin';
import { extraireMessageErreur } from '../../../fonctionnalites/partenaire/mes-produits/extraire-message-erreur';
import { Utilisateur } from '../../../modeles/utilisateur.model';

/**
 * Carte "Mon compte" : identité du compte connecté (prénom/nom/email,
 * téléphone et rôle en lecture seule) + section Sécurité (changement de PIN).
 * Partagée entre les pages "Mon profil" partenaire et admin/super-admin — ne
 * connaît rien de la vitrine partenaire ni des droits admin, entièrement
 * autonome (charge et met à jour elle-même GET/PATCH /auth/moi/).
 */
@Component({
  selector: 'app-carte-mon-compte',
  imports: [ReactiveFormsModule, DialogueChangerPin],
  templateUrl: './carte-mon-compte.html',
  styleUrl: './carte-mon-compte.scss',
})
export class CarteMonCompte implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  /** Libellé de rôle à afficher, si l'appelant veut remplacer la capitalisation par défaut (ex. "Super-admin"). */
  readonly libelleRole = input<string | null>(null);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  /** Toujours lu depuis AuthService : reste synchronisé avec l'en-tête après une mise à jour. */
  readonly utilisateur = this.authService.utilisateur;

  readonly modeEdition = signal(false);
  readonly pinDialogueOuvert = signal(false);

  readonly libelleRoleAffiche = computed(() => {
    const override = this.libelleRole();
    if (override) {
      return override;
    }
    const role = this.utilisateur()?.role;
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  });

  readonly formulaire = this.formBuilder.nonNullable.group({
    first_name: [''],
    last_name: [''],
    email: ['', [Validators.email]],
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.authService.rafraichirUtilisateur().subscribe({
      next: (utilisateur) => {
        this.chargementEnCours.set(false);
        this.appliquerUtilisateur(utilisateur);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  activerEdition(): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    const u = this.utilisateur();
    if (u) {
      this.appliquerUtilisateur(u);
    }
    this.modeEdition.set(true);
  }

  annulerEdition(): void {
    const u = this.utilisateur();
    if (u) {
      this.appliquerUtilisateur(u);
    }
    this.messageErreur.set(null);
    this.modeEdition.set(false);
  }

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const v = this.formulaire.getRawValue();
    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);

    this.authService
      .mettreAJourMonProfil({
        first_name: v.first_name,
        last_name: v.last_name,
        email: v.email,
      })
      .subscribe({
        next: () => {
          this.enregistrementEnCours.set(false);
          this.modeEdition.set(false);
          this.messageSucces.set('Profil mis à jour avec succès.');
        },
        error: (erreur: unknown) => {
          this.enregistrementEnCours.set(false);
          this.messageErreur.set(extraireMessageErreur(erreur));
        },
      });
  }

  // ---- Sécurité : changement de PIN ----

  ouvrirDialoguePin(): void {
    this.pinDialogueOuvert.set(true);
  }

  fermerDialoguePin(): void {
    this.pinDialogueOuvert.set(false);
  }

  surPinChange(): void {
    this.pinDialogueOuvert.set(false);
    this.messageSucces.set('PIN modifié avec succès.');
  }

  private appliquerUtilisateur(u: Utilisateur): void {
    this.formulaire.patchValue({
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      email: u.email ?? '',
    });
  }
}

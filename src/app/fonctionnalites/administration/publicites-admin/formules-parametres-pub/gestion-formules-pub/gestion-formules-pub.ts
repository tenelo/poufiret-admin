import { Component, OnDestroy, OnInit, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { DialogFormulePub } from '../dialog-formule-pub/dialog-formule-pub';
import { ErreursFormulaire, extraireErreursFormulaire } from '../extraire-erreurs-champs';
import { FormulesPubAdminService } from '../formules-pub-admin.service';
import { extraireMessageErreur } from '../../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterNombre } from '../../../tableau-de-bord-admin/palette-graphiques';
import {
  FormulePubAdmin,
  RequeteFormulePub,
  libelleTypeAffichagePub,
} from '../../../../../modeles/formule-pub-admin.model';

const DUREE_MESSAGE_MS = 6000;

/**
 * Liste des formules publicitaires (actives et inactives) avec création, édition,
 * activation/désactivation et suppression, chaque action sensible passant par une confirmation.
 * Émet `modifie` après chaque écriture réussie pour que le parent rafraîchisse les quotas.
 */
@Component({
  selector: 'app-gestion-formules-pub',
  imports: [DialogFormulePub],
  templateUrl: './gestion-formules-pub.html',
  styleUrl: './gestion-formules-pub.scss',
})
export class GestionFormulesPub implements OnInit, OnDestroy {
  private readonly service = inject(FormulesPubAdminService);

  readonly modifie = output<void>();

  readonly formaterNombre = formaterNombre;
  readonly libelleType = libelleTypeAffichagePub;

  readonly formules = signal<FormulePubAdmin[]>([]);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Création / édition ----
  readonly dialogOuvert = signal(false);
  readonly formuleEnEdition = signal<FormulePubAdmin | null>(null);
  readonly enregistrementEnCours = signal(false);
  readonly erreursFormulaire = signal<ErreursFormulaire | null>(null);

  // ---- Activation / désactivation ----
  readonly formuleABasculer = signal<FormulePubAdmin | null>(null);
  readonly basculeEnCours = signal(false);
  readonly erreurBascule = signal<string | null>(null);

  // ---- Suppression ----
  readonly formuleASupprimer = signal<FormulePubAdmin | null>(null);
  readonly suppressionEnCours = signal(false);
  readonly erreurSuppression = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerMessage);
  }

  charger(silencieux = false): void {
    if (!silencieux) {
      this.chargementEnCours.set(true);
    }
    this.erreurChargement.set(null);

    this.service.lister().subscribe({
      next: (formules) => {
        this.chargementEnCours.set(false);
        this.formules.set(formules);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  emplacements(formule: FormulePubAdmin): string {
    return formule.types_affichage.map((type) => libelleTypeAffichagePub(type)).join(', ') || '—';
  }

  // ---- Création / édition ----

  ouvrirCreation(): void {
    this.formuleEnEdition.set(null);
    this.erreursFormulaire.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(formule: FormulePubAdmin): void {
    this.formuleEnEdition.set(formule);
    this.erreursFormulaire.set(null);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
    this.formuleEnEdition.set(null);
    this.erreursFormulaire.set(null);
  }

  enregistrer(donnees: RequeteFormulePub): void {
    if (this.enregistrementEnCours()) {
      return;
    }
    const edition = this.formuleEnEdition();
    this.enregistrementEnCours.set(true);
    this.erreursFormulaire.set(null);

    const appel = edition ? this.service.modifier(edition.id, donnees) : this.service.creer(donnees);
    appel.subscribe({
      next: (formule) => {
        this.enregistrementEnCours.set(false);
        this.fermerDialog();
        this.apresEcriture(
          edition ? `Formule « ${formule.nom} » mise à jour.` : `Formule « ${formule.nom} » créée.`,
        );
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.erreursFormulaire.set(
          extraireErreursFormulaire(erreur) ?? { champs: {}, general: extraireMessageErreur(erreur) },
        );
      },
    });
  }

  // ---- Activation / désactivation ----

  demanderBascule(formule: FormulePubAdmin): void {
    this.erreurBascule.set(null);
    this.formuleABasculer.set(formule);
  }

  annulerBascule(): void {
    this.formuleABasculer.set(null);
  }

  confirmerBascule(): void {
    const formule = this.formuleABasculer();
    if (!formule || this.basculeEnCours()) {
      return;
    }
    this.basculeEnCours.set(true);
    this.erreurBascule.set(null);

    const activer = !formule.est_active;
    this.service.modifier(formule.id, { est_active: activer }).subscribe({
      next: () => {
        this.basculeEnCours.set(false);
        this.formuleABasculer.set(null);
        this.apresEcriture(`Formule « ${formule.nom} » ${activer ? 'activée' : 'désactivée'}.`);
      },
      error: (erreur: unknown) => {
        this.basculeEnCours.set(false);
        this.erreurBascule.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Suppression ----

  demanderSuppression(formule: FormulePubAdmin): void {
    this.erreurSuppression.set(null);
    this.formuleASupprimer.set(formule);
  }

  annulerSuppression(): void {
    this.formuleASupprimer.set(null);
  }

  confirmerSuppression(): void {
    const formule = this.formuleASupprimer();
    if (!formule || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set(null);

    this.service.supprimer(formule.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.formuleASupprimer.set(null);
        this.apresEcriture(`Formule « ${formule.nom} » supprimée.`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        // 409 : formule utilisée par des campagnes — message du backend tel quel, avec l'alternative.
        this.erreurSuppression.set(
          erreur instanceof HttpErrorResponse && typeof erreur.error?.message === 'string'
            ? erreur.error.message
            : extraireMessageErreur(erreur),
        );
      },
    });
  }

  /** Proposé après un refus de suppression : désactive la formule au lieu de la supprimer. */
  desactiverALaPlace(): void {
    const formule = this.formuleASupprimer();
    if (!formule || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);

    this.service.modifier(formule.id, { est_active: false }).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.formuleASupprimer.set(null);
        this.apresEcriture(`Formule « ${formule.nom} » désactivée.`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set(extraireMessageErreur(erreur));
      },
    });
  }

  /** Après chaque écriture : message éphémère, rechargement de la liste et des quotas. */
  private apresEcriture(message: string): void {
    this.messageErreur.set(null);
    this.messageSucces.set(message);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);

    this.charger(true);
    this.modifie.emit();
  }
}

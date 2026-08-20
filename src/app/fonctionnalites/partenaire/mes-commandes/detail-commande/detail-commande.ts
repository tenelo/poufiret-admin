import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { MesCommandesService } from '../mes-commandes.service';
import { extraireMessageErreur } from '../../mes-produits/extraire-message-erreur';
import {
  ActionTransitionCommande,
  Commande,
  LIBELLES_MODE_LIVRAISON,
  LIBELLES_MODE_PAIEMENT,
  LIBELLES_STATUT_COMMANDE,
  TRANSITIONS_PARTENAIRE,
} from '../../../../modeles/commande.model';

/**
 * Détail d'une commande, affiché en overlay par l'écran "Mes commandes" :
 * lignes, montants, et boutons d'action contextuels selon le statut courant.
 */
@Component({
  selector: 'app-detail-commande',
  imports: [DatePipe, JsonPipe],
  templateUrl: './detail-commande.html',
  styleUrl: './detail-commande.scss',
})
export class DetailCommande {
  private readonly mesCommandesService = inject(MesCommandesService);

  readonly commande = input.required<Commande>();

  readonly ferme = output<void>();
  readonly commandeMiseAJour = output<Commande>();

  readonly libellesStatut = LIBELLES_STATUT_COMMANDE;
  readonly libellesModeLivraison = LIBELLES_MODE_LIVRAISON;
  readonly libellesModePaiement = LIBELLES_MODE_PAIEMENT;

  readonly actionsDisponibles = computed(() => TRANSITIONS_PARTENAIRE[this.commande().statut]);
  readonly peutCommanderLivreur = computed(
    () => this.commande().statut === 'prete' && this.commande().mode_livraison === 'livraison',
  );

  readonly transitionEnCours = signal(false);
  readonly livreurEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly dialogRefusOuvert = signal(false);
  readonly motifRefus = signal('');
  readonly motifRefusTouche = signal(false);

  readonly actionAConfirmer = signal<ActionTransitionCommande | null>(null);

  /** Déclenché par un clic sur un bouton d'action de transition. */
  demanderAction(action: ActionTransitionCommande): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    if (action.requiertMotif) {
      this.motifRefus.set('');
      this.motifRefusTouche.set(false);
      this.dialogRefusOuvert.set(true);
      return;
    }
    if (action.dangereuse) {
      this.actionAConfirmer.set(action);
      return;
    }
    this.appliquerTransition(action.cible);
  }

  annulerDialogRefus(): void {
    this.dialogRefusOuvert.set(false);
  }

  confirmerRefus(): void {
    this.motifRefusTouche.set(true);
    if (!this.motifRefus().trim()) {
      return;
    }
    this.dialogRefusOuvert.set(false);
    this.appliquerTransition('refusee', this.motifRefus().trim());
  }

  annulerConfirmation(): void {
    this.actionAConfirmer.set(null);
  }

  confirmerAction(): void {
    const action = this.actionAConfirmer();
    if (!action) {
      return;
    }
    this.actionAConfirmer.set(null);
    this.appliquerTransition(action.cible);
  }

  private appliquerTransition(cible: Commande['statut'], raisonRefus?: string): void {
    this.transitionEnCours.set(true);
    this.messageErreur.set(null);

    this.mesCommandesService.changerStatut(this.commande().id, cible, raisonRefus).subscribe({
      next: (commande) => {
        this.transitionEnCours.set(false);
        this.messageSucces.set('Commande mise à jour avec succès.');
        this.commandeMiseAJour.emit(commande);
      },
      error: (erreur: unknown) => {
        this.transitionEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  commanderLivreur(): void {
    if (this.livreurEnCours()) {
      return;
    }
    this.livreurEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.mesCommandesService.commanderLivreur(this.commande().id).subscribe({
      next: () => {
        // La réponse ne contient pas la commande à jour : on la rafraîchit.
        this.mesCommandesService.obtenirCommande(this.commande().id).subscribe({
          next: (commande) => {
            this.livreurEnCours.set(false);
            this.messageSucces.set('Course de livraison commandée avec succès.');
            this.commandeMiseAJour.emit(commande);
          },
          error: (erreur: unknown) => {
            this.livreurEnCours.set(false);
            this.messageErreur.set(extraireMessageErreur(erreur));
          },
        });
      },
      error: (erreur: unknown) => {
        this.livreurEnCours.set(false);
        this.messageErreur.set(this.extraireMessageErreurLivreur(erreur));
      },
    });
  }

  private extraireMessageErreurLivreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
      const corps = erreur.error;
      const messageBackend =
        typeof corps?.message === 'string'
          ? corps.message
          : typeof corps?.detail === 'string'
            ? corps.detail
            : null;
      return messageBackend ?? 'Une course est déjà en cours pour cette commande.';
    }
    return extraireMessageErreur(erreur);
  }
}

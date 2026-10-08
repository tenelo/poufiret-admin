import { Component, HostListener, OnDestroy, effect, inject, input, output, signal, untracked } from '@angular/core';

import { DemandesLocationService } from '../../../locations/demandes-location.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterDateHeure, lienTel, lienWhatsApp } from '../../commandes-admin/formater-commande';
import { formaterFrancs, libelleTypeBien, nombreNuits, occupationHebergement } from '../../../locations/formater-location';
import {
  DemandeLocationDetail,
  MetaDemandes,
  TransitionPossibleDemande,
} from '../../../../modeles/reservation.model';

const DUREE_MESSAGE_MS = 6000;

/**
 * Panneau latéral de détail d'une demande de location (plein écran sur mobile) : logement/objet
 * concerné, client (appel/WhatsApp), dates, message, actions (transitions du backend, motif
 * obligatoire selon `commentaire_obligatoire`), notes internes et historique. Même pattern que
 * DetailCommandeAdmin. Émet `modifiee` après chaque écriture pour que le parent recharge la liste
 * et les compteurs.
 */
@Component({
  selector: 'app-detail-demande-location',
  imports: [],
  templateUrl: './detail-demande-location.html',
  styleUrl: './detail-demande-location.scss',
})
export class DetailDemandeLocation implements OnDestroy {
  private readonly service = inject(DemandesLocationService);

  readonly demandeId = input.required<number>();
  readonly meta = input<MetaDemandes | null>(null);

  readonly ferme = output<void>();
  readonly modifiee = output<void>();

  readonly formaterDateHeure = formaterDateHeure;
  readonly lienTel = lienTel;
  readonly lienWhatsApp = lienWhatsApp;
  readonly formaterFrancs = formaterFrancs;
  readonly libelleTypeBien = libelleTypeBien;
  readonly nombreNuits = nombreNuits;
  readonly occupationHebergement = occupationHebergement;

  readonly detail = signal<DemandeLocationDetail | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageSucces = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Action (transition), avec confirmation ----
  readonly transitionDemandee = signal<TransitionPossibleDemande | null>(null);
  readonly commentaire = signal('');
  readonly actionEnCours = signal(false);
  readonly erreurAction = signal<string | null>(null);

  // ---- Note interne ----
  readonly texteNote = signal('');
  readonly noteEnCours = signal(false);
  readonly erreurNote = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.demandeId();
      untracked(() => {
        this.transitionDemandee.set(null);
        this.charger(id);
      });
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerMessage);
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    if (this.transitionDemandee()) {
      this.annulerConfirmation();
    } else {
      this.ferme.emit();
    }
  }

  private charger(id: number, silencieux = false): void {
    if (!silencieux) {
      this.chargementEnCours.set(true);
      this.detail.set(null);
    }
    this.erreurChargement.set(null);

    this.service.detail(id).subscribe({
      next: (detail) => {
        this.chargementEnCours.set(false);
        this.detail.set(detail);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  libelleGroupe(statut: string): string {
    return this.meta()?.statuts.find((s) => s.valeur === statut)?.groupe ?? statut;
  }

  // ---- Transition ----

  demanderTransition(transition: TransitionPossibleDemande): void {
    this.commentaire.set('');
    this.erreurAction.set(null);
    this.transitionDemandee.set(transition);
  }

  annulerConfirmation(): void {
    if (!this.actionEnCours()) {
      this.transitionDemandee.set(null);
    }
  }

  confirmer(): void {
    const transition = this.transitionDemandee();
    const detail = this.detail();
    if (!transition || !detail || this.actionEnCours()) {
      return;
    }
    const commentaire = this.commentaire().trim();
    if (transition.commentaire_obligatoire && !commentaire) {
      this.erreurAction.set('Un commentaire est obligatoire pour cette action.');
      return;
    }

    this.actionEnCours.set(true);
    this.erreurAction.set(null);
    this.service.transition(detail.id, transition.action, commentaire || undefined).subscribe({
      next: (detailMisAJour) => {
        this.actionEnCours.set(false);
        this.transitionDemandee.set(null);
        this.detail.set(detailMisAJour);
        this.afficherSucces(`« ${transition.libelle} » appliqué.`);
        this.modifiee.emit();
      },
      error: (erreur: unknown) => {
        this.actionEnCours.set(false);
        this.erreurAction.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Notes internes ----

  ajouterNote(): void {
    const texte = this.texteNote().trim();
    const detail = this.detail();
    if (!texte || !detail || this.noteEnCours()) {
      return;
    }
    this.noteEnCours.set(true);
    this.erreurNote.set(null);

    this.service.ajouterNote(detail.id, texte).subscribe({
      next: (note) => {
        this.noteEnCours.set(false);
        this.texteNote.set('');
        this.detail.update((d) => (d ? { ...d, notes_admin: [...d.notes_admin, note] } : d));
      },
      error: (erreur: unknown) => {
        this.noteEnCours.set(false);
        this.erreurNote.set(extraireMessageErreur(erreur));
      },
    });
  }

  private afficherSucces(message: string): void {
    this.messageSucces.set(message);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);
  }
}

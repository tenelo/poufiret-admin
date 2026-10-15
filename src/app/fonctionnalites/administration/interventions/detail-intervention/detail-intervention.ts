import { Component, HostListener, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';

import { InterventionsService } from '../interventions.service';
import { HistoriqueCommande } from '../../commandes-admin/historique-commande/historique-commande';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterDateHeure, lienTel, lienWhatsApp } from '../../commandes-admin/formater-commande';
import {
  ArtisanCompatible,
  InterventionAdminDetail,
  TransitionPossibleIntervention,
} from '../../../../modeles/intervention-admin.model';

const DUREE_MESSAGE_MS = 6000;

/**
 * Panneau latéral de détail d'une demande d'intervention (plein écran sur mobile) : client et
 * artisan (appel/WhatsApp), description, adresse, photos, historique (réutilise HistoriqueCommande
 * tel quel, même forme d'événement), actions (transitions du backend), assignation d'un artisan
 * (liste déroulante des partenaires compatibles, GET /<id>/artisans-compatibles/) et notes internes
 * — ces trois dernières visibles uniquement avec gerer_interventions (sinon écran en lecture
 * seule). Émet `modifiee` après chaque écriture pour que le parent recharge la liste et les
 * compteurs.
 */
@Component({
  selector: 'app-detail-intervention',
  imports: [HistoriqueCommande],
  templateUrl: './detail-intervention.html',
  styleUrl: './detail-intervention.scss',
})
export class DetailIntervention implements OnDestroy {
  private readonly service = inject(InterventionsService);
  private readonly permissionsService = inject(PermissionsService);

  readonly interventionId = input.required<number>();

  readonly ferme = output<void>();
  readonly modifiee = output<void>();

  /** Droit d'écriture : actions, assignation et notes sont masquées sans lui. */
  readonly peutGerer = computed(() => this.permissionsService.aLaCapacite('gerer_interventions'));

  readonly formaterDateHeure = formaterDateHeure;
  readonly lienTel = lienTel;
  readonly lienWhatsApp = lienWhatsApp;

  readonly detail = signal<InterventionAdminDetail | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageSucces = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Action (transition), avec confirmation ----
  readonly transitionDemandee = signal<TransitionPossibleIntervention | null>(null);
  readonly commentaire = signal('');
  readonly actionEnCours = signal(false);
  readonly erreurAction = signal<string | null>(null);

  // ---- Assignation d'un artisan ----
  // Liste déroulante des partenaires actifs compatibles (GET /<id>/artisans-compatibles/).
  readonly artisansCompatibles = signal<ArtisanCompatible[]>([]);
  readonly chargementArtisans = signal(false);
  readonly erreurArtisans = signal<string | null>(null);
  readonly artisanIdChoisi = signal('');
  readonly assignationEnCours = signal(false);
  readonly erreurAssignation = signal<string | null>(null);

  // ---- Note interne ----
  readonly texteNote = signal('');
  readonly noteEnCours = signal(false);
  readonly erreurNote = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.interventionId();
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
        this.artisanIdChoisi.set(detail.artisan ? String(detail.artisan.id) : '');
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });

    if (this.peutGerer()) {
      this.chargerArtisansCompatibles(id);
    }
  }

  private chargerArtisansCompatibles(id: number): void {
    this.chargementArtisans.set(true);
    this.erreurArtisans.set(null);

    this.service.listerArtisansCompatibles(id).subscribe({
      next: (liste) => {
        this.chargementArtisans.set(false);
        this.artisansCompatibles.set(liste);
      },
      error: (erreur: unknown) => {
        this.chargementArtisans.set(false);
        this.erreurArtisans.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Transition ----

  demanderTransition(transition: TransitionPossibleIntervention): void {
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

  // ---- Assignation d'un artisan ----

  assigner(): void {
    const detail = this.detail();
    const artisanId = Number(this.artisanIdChoisi());
    if (!detail || this.assignationEnCours() || !Number.isInteger(artisanId) || artisanId <= 0) {
      this.erreurAssignation.set('Choisissez un artisan.');
      return;
    }

    this.assignationEnCours.set(true);
    this.erreurAssignation.set(null);
    this.service.assigner(detail.id, artisanId).subscribe({
      next: (detailMisAJour) => {
        this.assignationEnCours.set(false);
        this.detail.set(detailMisAJour);
        this.afficherSucces('Artisan assigné.');
        this.modifiee.emit();
      },
      error: (erreur: unknown) => {
        this.assignationEnCours.set(false);
        this.erreurAssignation.set(extraireMessageErreur(erreur));
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

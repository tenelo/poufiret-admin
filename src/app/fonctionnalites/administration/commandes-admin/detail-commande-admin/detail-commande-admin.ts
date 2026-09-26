import { Component, HostListener, OnDestroy, effect, inject, input, output, signal, untracked } from '@angular/core';

import { CommandesAdminService } from '../commandes-admin.service';
import { HistoriqueCommande } from '../historique-commande/historique-commande';
import { NotesCommande } from '../notes-commande/notes-commande';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  CommandeAdminDetail,
  MetaCommandes,
  NoteAdmin,
  TransitionPossible,
} from '../../../../modeles/commande-admin.model';
import {
  classeAge,
  formaterAge,
  formaterDateHeure,
  formaterMontant,
  lienTel,
  lienWhatsApp,
} from '../formater-commande';

const DUREE_MESSAGE_MS = 6000;

type Confirmation = { type: 'transition'; transition: TransitionPossible } | { type: 'livreur' };

/**
 * Panneau latéral de détail d'une commande (plein écran sur mobile) : contacts, lignes, adresse,
 * actions (transitions du backend, demande de livreur), suivi de livraison, notes internes et
 * historique. Émet `modifiee` après chaque écriture pour que le parent recharge la liste et les
 * compteurs.
 */
@Component({
  selector: 'app-detail-commande-admin',
  imports: [HistoriqueCommande, NotesCommande],
  templateUrl: './detail-commande-admin.html',
  styleUrl: './detail-commande-admin.scss',
})
export class DetailCommandeAdmin implements OnDestroy {
  private readonly service = inject(CommandesAdminService);

  readonly commandeId = input.required<number>();
  readonly meta = input<MetaCommandes | null>(null);

  readonly ferme = output<void>();
  readonly modifiee = output<void>();

  readonly formaterMontant = formaterMontant;
  readonly formaterAge = formaterAge;
  readonly formaterDateHeure = formaterDateHeure;
  readonly classeAge = classeAge;
  readonly lienTel = lienTel;
  readonly lienWhatsApp = lienWhatsApp;

  readonly detail = signal<CommandeAdminDetail | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageSucces = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Actions (transition / demande de livreur), avec confirmation ----
  readonly confirmation = signal<Confirmation | null>(null);
  readonly commentaire = signal('');
  readonly actionEnCours = signal(false);
  readonly erreurAction = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.commandeId();
      untracked(() => {
        this.confirmation.set(null);
        this.charger(id);
      });
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerMessage);
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    if (this.confirmation()) {
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

  libelleGroupe(code: string): string {
    return this.meta()?.groupes.find((g) => g.code === code)?.libelle ?? code;
  }

  lienCarte(detail: CommandeAdminDetail): string | null {
    const adresse = detail.adresse_livraison;
    return adresse?.latitude != null && adresse?.longitude != null
      ? `https://www.google.com/maps?q=${adresse.latitude},${adresse.longitude}`
      : null;
  }

  // ---- Actions ----

  demanderTransition(transition: TransitionPossible): void {
    this.commentaire.set('');
    this.erreurAction.set(null);
    this.confirmation.set({ type: 'transition', transition });
  }

  demanderLivreur(): void {
    this.commentaire.set('');
    this.erreurAction.set(null);
    this.confirmation.set({ type: 'livreur' });
  }

  annulerConfirmation(): void {
    if (!this.actionEnCours()) {
      this.confirmation.set(null);
    }
  }

  confirmer(): void {
    const confirmation = this.confirmation();
    const detail = this.detail();
    if (!confirmation || !detail || this.actionEnCours()) {
      return;
    }
    const commentaire = this.commentaire().trim();

    if (confirmation.type === 'transition') {
      const { transition } = confirmation;
      if (transition.commentaire_obligatoire && !commentaire) {
        this.erreurAction.set('Un commentaire est obligatoire pour cette action.');
        return;
      }
      this.actionEnCours.set(true);
      this.erreurAction.set(null);
      this.service.transition(detail.id, transition.action, commentaire || undefined).subscribe({
        next: (detailMisAJour) => {
          this.actionEnCours.set(false);
          this.confirmation.set(null);
          this.detail.set(detailMisAJour);
          this.afficherSucces(`« ${transition.libelle} » appliqué.`);
          this.modifiee.emit();
        },
        error: (erreur: unknown) => this.echecAction(erreur),
      });
      return;
    }

    this.actionEnCours.set(true);
    this.erreurAction.set(null);
    this.service.demanderLivreur(detail.id, commentaire || undefined).subscribe({
      next: () => {
        this.actionEnCours.set(false);
        this.confirmation.set(null);
        this.afficherSucces('Livreur demandé à TeneLivr.');
        this.charger(detail.id, true);
        this.modifiee.emit();
      },
      // 409 (déjà demandé) et 400 (non éligible) : message du backend affiché dans la confirmation.
      error: (erreur: unknown) => this.echecAction(erreur),
    });
  }

  private echecAction(erreur: unknown): void {
    this.actionEnCours.set(false);
    this.erreurAction.set(extraireMessageErreur(erreur));
  }

  /** Note créée par le sous-composant : ajoutée au détail affiché. */
  ajouterNoteAuDetail(note: NoteAdmin): void {
    this.detail.update((d) => (d ? { ...d, notes_admin: [...d.notes_admin, note] } : d));
  }

  private afficherSucces(message: string): void {
    this.messageSucces.set(message);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);
  }
}

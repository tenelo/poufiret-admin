import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { DemandesPartenariatService } from './demandes-partenariat.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { DemandePartenariat } from '../../../modeles/demande-partenariat.model';

// Une demande non traitée depuis ce délai est mise en avant visuellement.
const SEUIL_ANCIENNETE_JOURS = 7;

/**
 * Écran "Demandes de partenariat" : file d'attente des demandes en attente,
 * avec actions accepter/rejeter (GET/POST /administration/demandes-partenariat/).
 */
@Component({
  selector: 'app-demandes-partenariat',
  imports: [],
  templateUrl: './demandes-partenariat.html',
  styleUrl: './demandes-partenariat.scss',
})
export class DemandesPartenariat implements OnInit {
  private readonly service = inject(DemandesPartenariatService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly demandes = signal<DemandePartenariat[]>([]);

  readonly total = computed(() => this.demandes().length);

  readonly demandeEnCoursId = signal<number | null>(null);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly demandeAConfirmerAcceptation = signal<DemandePartenariat | null>(null);
  readonly demandeARejeter = signal<DemandePartenariat | null>(null);
  readonly motifRejet = signal('');
  readonly motifRejetTouche = signal(false);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.charger().subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.demandes.set(reponse.demandes);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  demanderAcceptation(demande: DemandePartenariat): void {
    this.messageErreur.set(null);
    this.demandeAConfirmerAcceptation.set(demande);
  }

  annulerAcceptation(): void {
    this.demandeAConfirmerAcceptation.set(null);
  }

  confirmerAcceptation(): void {
    const demande = this.demandeAConfirmerAcceptation();
    if (!demande) {
      return;
    }
    this.demandeAConfirmerAcceptation.set(null);
    this.appliquerDecision(demande, 'accepter');
  }

  demanderRejet(demande: DemandePartenariat): void {
    this.messageErreur.set(null);
    this.motifRejet.set('');
    this.motifRejetTouche.set(false);
    this.demandeARejeter.set(demande);
  }

  annulerRejet(): void {
    this.demandeARejeter.set(null);
  }

  confirmerRejet(): void {
    this.motifRejetTouche.set(true);
    const demande = this.demandeARejeter();
    if (!demande || !this.motifRejet().trim()) {
      return;
    }
    this.demandeARejeter.set(null);
    this.appliquerDecision(demande, 'rejeter', this.motifRejet().trim());
  }

  private appliquerDecision(
    demande: DemandePartenariat,
    decision: 'accepter' | 'rejeter',
    motif?: string,
  ): void {
    this.demandeEnCoursId.set(demande.id);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.service.decider(demande.id, decision, motif).subscribe({
      next: () => {
        this.demandeEnCoursId.set(null);
        this.retirerDemande(demande.id);
        this.messageSucces.set(
          decision === 'accepter'
            ? `« ${demande.nom_commerce} » accepté avec succès.`
            : `Demande de « ${demande.nom_commerce} » rejetée.`,
        );
      },
      error: (erreur: unknown) => {
        this.demandeEnCoursId.set(null);
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.retirerDemande(demande.id);
          this.messageErreur.set('Cette demande a déjà été traitée.');
          return;
        }
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  private retirerDemande(id: number): void {
    this.demandes.update((liste) => liste.filter((d) => d.id !== id));
  }

  /** Date relative simple (à l'instant / il y a N min / il y a N h / il y a N j / date). */
  formaterDateRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  estAncienne(iso: string): boolean {
    const diffJ = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
    return diffJ >= SEUIL_ANCIENNETE_JOURS;
  }
}

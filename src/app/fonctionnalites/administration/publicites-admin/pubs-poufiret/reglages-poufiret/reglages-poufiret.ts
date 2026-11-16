import { Component, OnInit, inject, signal } from '@angular/core';

import { PubsPoufiretService } from '../pubs-poufiret.service';
import { extraireMessageErreur } from '../../../tableau-de-bord-admin/extraire-message-erreur';
import { ReglagesPoufiret } from '../../../../../modeles/pub-poufiret.model';

/**
 * Onglet « Réglages » des pubs Poufiret (capacité gerer_pubs_poufiret) : interrupteurs pubs
 * maison / parcours (immédiats), fréquence et durée d'affichage (bouton Enregistrer).
 */
@Component({
  selector: 'app-reglages-poufiret',
  imports: [],
  templateUrl: './reglages-poufiret.html',
  styleUrl: './reglages-poufiret.scss',
})
export class ReglagesPoufiretComposant implements OnInit {
  private readonly service = inject(PubsPoufiretService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly reglages = signal<ReglagesPoufiret | null>(null);

  readonly frequence = signal(3);
  readonly dureeAffichage = signal(5);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);
  readonly erreurChamps = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);
    this.service.chargerReglages().subscribe({
      next: (reglages) => {
        this.chargementEnCours.set(false);
        this.reglages.set(reglages);
        this.frequence.set(reglages.frequence_pub_maison);
        this.dureeAffichage.set(reglages.duree_affichage_secondes);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerPubsMaisonActives(): void {
    const actuel = this.reglages();
    if (!actuel) return;
    this.messageErreur.set(null);
    const nouvelleValeur = !actuel.pubs_maison_actives;
    this.reglages.set({ ...actuel, pubs_maison_actives: nouvelleValeur });
    this.service.modifierReglages({ pubsMaisonActives: nouvelleValeur }).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.reglages.set(actuel);
      },
    });
  }

  basculerParcoursActif(): void {
    const actuel = this.reglages();
    if (!actuel) return;
    this.messageErreur.set(null);
    const nouvelleValeur = !actuel.parcours_actif;
    this.reglages.set({ ...actuel, parcours_actif: nouvelleValeur });
    this.service.modifierReglages({ parcoursActif: nouvelleValeur }).subscribe({
      // Message du serveur tel quel (ex. nombre d'écrans actifs hors de la plage autorisée).
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.reglages.set(actuel);
      },
    });
  }

  enregistrerFrequenceEtDuree(): void {
    const erreurs: Record<string, string> = {};
    if (!Number.isInteger(this.frequence()) || this.frequence() < 1 || this.frequence() > 50) {
      erreurs['frequence'] = 'La fréquence doit être un entier entre 1 et 50.';
    }
    if (!Number.isInteger(this.dureeAffichage()) || this.dureeAffichage() < 1 || this.dureeAffichage() > 60) {
      erreurs['duree'] = "La durée d'affichage doit être un entier entre 1 et 60 secondes.";
    }
    this.erreurChamps.set(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.service
      .modifierReglages({ frequencePubMaison: this.frequence(), dureeAffichageSecondes: this.dureeAffichage() })
      .subscribe({
        next: (reglages) => {
          this.enregistrementEnCours.set(false);
          this.reglages.set(reglages);
          this.messageSucces.set('Réglages enregistrés.');
        },
        error: (erreur: unknown) => {
          this.enregistrementEnCours.set(false);
          this.messageErreur.set(extraireMessageErreur(erreur));
        },
      });
  }
}

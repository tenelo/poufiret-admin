import { Component, OnInit, computed, inject, input, signal } from '@angular/core';

import { DemandesLocationService } from '../demandes-location.service';
import { DemandesLocationAdmin } from '../../administration/demandes-location/demandes-location-admin';
import { PrefixeLocation } from '../location.service';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { formaterDateHeure, lienTel, lienWhatsApp } from '../../administration/commandes-admin/formater-commande';
import { DemandeLocation, TransitionPossibleDemande } from '../../../modeles/reservation.model';

const TAILLE_PAGE = 20;

/**
 * Onglet « Demandes » de l'espace loueur : côté loueur, liste de ses propres demandes
 * (/reservations/mon-espace/) avec actions en ligne, pilotées par `transitions_possibles` fourni
 * sur chaque demande (motif obligatoire selon `commentaire_obligatoire`) ; côté admin, le centre
 * complet des demandes (DemandesLocationAdmin), filtré et verrouillé sur ce loueur via
 * `partenaireFixe` — aucune duplication entre les deux usages.
 */
@Component({
  selector: 'app-onglet-demandes-loueur',
  imports: [DemandesLocationAdmin],
  templateUrl: './onglet-demandes-loueur.html',
  styleUrl: './onglet-demandes-loueur.scss',
})
export class OngletDemandesLoueur implements OnInit {
  private readonly service = inject(DemandesLocationService);

  // Non utilisé par l'appel au service (les demandes ne sont pas paramétrées par préfixe), mais
  // reçu pour cohérence avec EspaceLoueur et les autres onglets.
  readonly prefixe = input.required<PrefixeLocation>();
  readonly estAdmin = input(false);
  readonly partenaireId = input<number | null>(null);
  readonly nomLoueur = input<string | null>(null);

  readonly formaterDateHeure = formaterDateHeure;
  readonly lienTel = lienTel;
  readonly lienWhatsApp = lienWhatsApp;

  readonly partenaireFixe = computed(() => {
    const id = this.partenaireId();
    const nom = this.nomLoueur();
    return id ? { id, nom: nom ?? 'ce loueur' } : null;
  });

  readonly demandes = signal<DemandeLocation[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly statutsDisponibles = computed(() => {
    const vus = new Map<string, string>();
    for (const demande of this.demandes()) {
      if (!vus.has(demande.statut)) {
        vus.set(demande.statut, demande.statut_libelle);
      }
    }
    return [...vus.entries()].map(([valeur, libelle]) => ({ valeur, libelle }));
  });
  readonly statutChoisi = signal('');

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / TAILLE_PAGE)));

  readonly demandeOuverteId = signal<number | null>(null);
  readonly commentaire = signal('');
  readonly actionEnCours = signal(false);
  readonly erreurAction = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.estAdmin()) {
      this.charger();
    }
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerMesDemandes(this.statutChoisi(), this.page(), TAILLE_PAGE).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.demandes.set(reponse.results);
        this.total.set(reponse.count);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerStatut(valeur: string): void {
    this.statutChoisi.set(valeur);
    this.page.set(1);
    this.charger();
  }

  changerPage(page: number): void {
    this.page.set(page);
    this.charger();
  }

  basculerDemande(id: number): void {
    this.demandeOuverteId.set(this.demandeOuverteId() === id ? null : id);
    this.commentaire.set('');
    this.erreurAction.set(null);
  }

  agir(demande: DemandeLocation, transition: TransitionPossibleDemande): void {
    const commentaire = this.commentaire().trim();
    if (transition.commentaire_obligatoire && !commentaire) {
      this.erreurAction.set('Un commentaire est obligatoire pour cette action.');
      return;
    }
    this.actionEnCours.set(true);
    this.erreurAction.set(null);

    this.service.transitionLoueur(demande.id, transition.action, commentaire || undefined).subscribe({
      next: (misAJour) => {
        this.actionEnCours.set(false);
        this.demandes.update((liste) => liste.map((d) => (d.id === misAJour.id ? misAJour : d)));
        this.demandeOuverteId.set(null);
        this.commentaire.set('');
      },
      error: (erreur: unknown) => {
        this.actionEnCours.set(false);
        this.erreurAction.set(extraireMessageErreur(erreur));
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { OngletGestionPublicitesService } from './onglet-gestion-publicites.service';
import { FormulaireCreationPublicite } from './formulaire-creation-publicite/formulaire-creation-publicite';
import { extraireMessageErreur } from '../../mes-produits/extraire-message-erreur';
import {
  FormulePublicite,
  LIBELLES_STATUT_PUBLICITE,
  MaPublicite,
  RequeteCreationPublicite,
} from '../../../../modeles/publicite.model';

/**
 * Onglet "Gérer mes publicités" : liste des campagnes, création (statut
 * brouillon) et soumission (brouillon -> en attente de paiement). La
 * validation et le paiement se font ensuite côté admin, hors de cet écran.
 */
@Component({
  selector: 'app-onglet-gestion-publicites',
  imports: [FormulaireCreationPublicite],
  templateUrl: './onglet-gestion-publicites.html',
  styleUrl: './onglet-gestion-publicites.scss',
})
export class OngletGestionPublicites implements OnInit {
  private readonly service = inject(OngletGestionPublicitesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly formules = signal<FormulePublicite[]>([]);
  readonly publicites = signal<MaPublicite[]>([]);

  readonly libellesStatut = LIBELLES_STATUT_PUBLICITE;

  readonly formulaireOuvert = signal(false);
  readonly enregistrementEnCours = signal(false);
  readonly messageErreurFormulaire = signal<string | null>(null);

  readonly soumissionEnCoursId = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    forkJoin({
      formules: this.service.listerFormules(),
      publicites: this.service.listerMesPublicites(),
    }).subscribe({
      next: ({ formules, publicites }) => {
        this.chargementEnCours.set(false);
        this.formules.set(formules);
        this.publicites.set(publicites);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  ouvrirCreation(): void {
    this.messageErreurFormulaire.set(null);
    this.formulaireOuvert.set(true);
  }

  fermerCreation(): void {
    this.formulaireOuvert.set(false);
    this.messageErreurFormulaire.set(null);
  }

  creerCampagne(donnees: RequeteCreationPublicite): void {
    this.enregistrementEnCours.set(true);
    this.messageErreurFormulaire.set(null);

    this.service.creerPublicite(donnees).subscribe({
      next: (publicite) => {
        this.enregistrementEnCours.set(false);
        this.publicites.update((liste) => [publicite, ...liste]);
        this.fermerCreation();
        this.messageSucces.set('Campagne créée en brouillon avec succès.');
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreurFormulaire.set(extraireMessageErreur(erreur));
      },
    });
  }

  soumettre(publicite: MaPublicite): void {
    if (this.soumissionEnCoursId()) {
      return;
    }
    this.soumissionEnCoursId.set(publicite.id);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.service.soumettrePublicite(publicite.id).subscribe({
      next: (reponse) => {
        this.soumissionEnCoursId.set(null);
        this.publicites.update((liste) =>
          liste.map((p) =>
            p.id === publicite.id ? { ...p, statut: reponse.statut as MaPublicite['statut'] } : p,
          ),
        );
        this.messageSucces.set(reponse.message || 'Campagne soumise avec succès.');
      },
      error: (erreur: unknown) => {
        this.soumissionEnCoursId.set(null);
        this.messageErreur.set(this.extraireMessageErreurSoumission(erreur));
      },
    });
  }

  nomFormule(id: number): string {
    return this.formules().find((f) => f.id === id)?.nom ?? `Formule #${id}`;
  }

  peutSoumettre(publicite: MaPublicite): boolean {
    return publicite.statut === 'brouillon';
  }

  private extraireMessageErreurSoumission(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
      const corps = erreur.error;
      const messageBackend =
        typeof corps?.message === 'string'
          ? corps.message
          : typeof corps?.detail === 'string'
            ? corps.detail
            : null;
      return messageBackend ?? 'Le quota de partenaires de cette formule est atteint.';
    }
    return extraireMessageErreur(erreur);
  }
}

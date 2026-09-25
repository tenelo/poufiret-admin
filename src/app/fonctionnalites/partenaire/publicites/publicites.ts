import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { OngletPointsPublicites } from './onglet-points-publicites/onglet-points-publicites';
import { OngletGestionPublicites } from './onglet-gestion-publicites/onglet-gestion-publicites';
import { OngletFormulesDisponibles } from './onglet-formules-disponibles/onglet-formules-disponibles';
import { OngletGestionPublicitesService } from './onglet-gestion-publicites/onglet-gestion-publicites.service';
import { FormulaireCreationPublicite } from './onglet-gestion-publicites/formulaire-creation-publicite/formulaire-creation-publicite';
import { extraireMessageErreur } from '../mes-produits/extraire-message-erreur';
import {
  FormulePublicite,
  PorteePublicite,
  RequeteCreationPublicite,
} from '../../../modeles/publicite.model';

type SousOnglet = 'points' | 'gestion' | 'formules';

const DUREE_MESSAGE_MS = 6000;

/**
 * Écran "Publicités" de l'espace partenaire : statistiques des campagnes
 * ("Points des Publicités"), gestion (soumission, reconduction..., "Gérer mes
 * publicités") et catalogue pédagogique des formules ("Formules
 * disponibles"), chacun avec son propre chargement. Le bouton de création de
 * campagne est dans l'en-tête, donc disponible depuis les trois onglets.
 */
@Component({
  selector: 'app-publicites',
  imports: [
    OngletPointsPublicites,
    OngletGestionPublicites,
    OngletFormulesDisponibles,
    FormulaireCreationPublicite,
  ],
  templateUrl: './publicites.html',
  styleUrl: './publicites.scss',
})
export class Publicites {
  private readonly service = inject(OngletGestionPublicitesService);

  readonly sousOngletActif = signal<SousOnglet>('points');

  readonly sousOnglets: { valeur: SousOnglet; libelle: string }[] = [
    { valeur: 'points', libelle: 'Points des Publicités' },
    { valeur: 'gestion', libelle: 'Gérer mes publicités' },
    { valeur: 'formules', libelle: 'Formules disponibles' },
  ];

  // Changer cette clé recrée l'onglet affiché, donc recharge sa liste (voir template).
  private readonly cleRechargement = signal(0);
  readonly clesOnglet = computed(() => [this.cleRechargement()]);

  // ---- Création d'une campagne ----
  readonly formules = signal<FormulePublicite[]>([]);
  readonly porteeForfait = signal<PorteePublicite | null>(null);
  readonly chargementFormules = signal(false);
  readonly formulaireOuvert = signal(false);
  readonly enregistrementEnCours = signal(false);
  readonly messageErreurFormulaire = signal<string | null>(null);
  readonly erreursChampsFormulaire = signal<Record<string, string> | null>(null);

  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  changerSousOnglet(onglet: SousOnglet): void {
    this.sousOngletActif.set(onglet);
  }

  /** Charge les formules (nécessaires au formulaire) puis ouvre le dialog de création. */
  ouvrirCreation(): void {
    if (this.chargementFormules()) {
      return;
    }
    this.messageErreurFormulaire.set(null);
    this.erreursChampsFormulaire.set(null);
    this.messageErreur.set(null);

    this.chargementFormules.set(true);
    forkJoin({
      formules: this.service.listerFormules(),
      porteeForfait: this.service.chargerPorteeForfait(),
    }).subscribe({
      next: ({ formules, porteeForfait }) => {
        this.chargementFormules.set(false);
        this.formules.set(formules);
        this.porteeForfait.set(porteeForfait);
        this.formulaireOuvert.set(true);
      },
      error: (erreur: unknown) => {
        this.chargementFormules.set(false);
        this.afficherMessage(extraireMessageErreur(erreur), true);
      },
    });
  }

  fermerCreation(): void {
    this.formulaireOuvert.set(false);
    this.messageErreurFormulaire.set(null);
    this.erreursChampsFormulaire.set(null);
  }

  creerCampagne(donnees: RequeteCreationPublicite): void {
    if (this.enregistrementEnCours()) {
      return;
    }
    this.enregistrementEnCours.set(true);
    this.messageErreurFormulaire.set(null);
    this.erreursChampsFormulaire.set(null);

    this.service.creerPublicite(donnees).subscribe({
      next: () => {
        // Message de succès uniquement après une réponse 2xx.
        this.enregistrementEnCours.set(false);
        this.fermerCreation();
        this.afficherMessage('Campagne créée en brouillon avec succès — pensez à la soumettre.', false);
        // On bascule sur "Gérer mes publicités" (recréé donc rechargé) pour voir le brouillon.
        this.sousOngletActif.set('gestion');
        this.cleRechargement.update((cle) => cle + 1);
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        const champs = this.extraireErreursChamps(erreur);
        if (champs) {
          this.erreursChampsFormulaire.set(champs);
        } else {
          this.messageErreurFormulaire.set(extraireMessageErreur(erreur));
        }
      },
    });
  }

  private afficherMessage(texte: string, erreur: boolean): void {
    this.messageSucces.set(erreur ? null : texte);
    this.messageErreur.set(erreur ? texte : null);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => {
      this.messageSucces.set(null);
      this.messageErreur.set(null);
    }, DUREE_MESSAGE_MS);
  }

  /**
   * 400 de validation DRF ({champ: ["msg"]}, éventuellement sous `details`) →
   * premier message par champ du formulaire ; null si aucun champ reconnu.
   */
  private extraireErreursChamps(erreur: unknown): Record<string, string> | null {
    if (!(erreur instanceof HttpErrorResponse) || erreur.status !== 400) {
      return null;
    }
    const corps = erreur.error;
    const source = corps?.details && typeof corps.details === 'object' ? corps.details : corps;
    if (!source || typeof source !== 'object') {
      return null;
    }

    const resultat: Record<string, string> = {};
    for (const champ of ['formule', 'titre', 'description', 'portee', 'image_couverture', 'video']) {
      const valeur = source[champ];
      const message = Array.isArray(valeur) ? valeur[0] : valeur;
      if (typeof message === 'string' && message) {
        resultat[champ] = message;
      }
    }
    return Object.keys(resultat).length > 0 ? resultat : null;
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { OngletGestionPublicitesService } from './onglet-gestion-publicites.service';
import { FormulaireCreationPublicite } from './formulaire-creation-publicite/formulaire-creation-publicite';
import { DialogDetailPublicite } from './dialog-detail-publicite/dialog-detail-publicite';
import { DialogReconduction, DonneesReconduction } from './dialog-reconduction/dialog-reconduction';
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
  imports: [FormulaireCreationPublicite, DialogDetailPublicite, DialogReconduction],
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

  // ---- Détail d'une campagne ----
  readonly publiciteDetail = signal<MaPublicite | null>(null);

  // ---- Modification de l'image d'une campagne existante ----
  readonly envoiImageEnCoursId = signal<string | null>(null);
  readonly erreurImage = signal<string | null>(null);

  // ---- Reconduction ----
  readonly publiciteAReconduire = signal<MaPublicite | null>(null);
  readonly reconductionEnCours = signal(false);
  readonly erreurReconduction = signal<string | null>(null);

  // ---- Masquage (retrait des listes) ----
  readonly publiciteASupprimer = signal<MaPublicite | null>(null);
  readonly suppressionEnCours = signal(false);
  readonly erreurSuppression = signal<string | null>(null);

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

  /**
   * Prix de la formule d'une campagne : préfère la dénormalisation éventuelle
   * du backend (`formule_prix`), sinon la résout via la liste des formules.
   */
  prixFormule(publicite: MaPublicite): number | null {
    if (publicite.formule_prix !== undefined) {
      return publicite.formule_prix;
    }
    return this.formules().find((f) => f.id === publicite.formule)?.prix ?? null;
  }

  libelleFormule(publicite: MaPublicite): string {
    const nom = publicite.formule_nom ?? this.nomFormule(publicite.formule);
    const prix = this.prixFormule(publicite);
    return prix !== null ? `${nom} — ${prix} FCFA` : nom;
  }

  peutSoumettre(publicite: MaPublicite): boolean {
    return publicite.statut === 'brouillon';
  }

  peutReconduire(publicite: MaPublicite): boolean {
    return publicite.statut === 'terminee';
  }

  // ---- Détail d'une campagne ----

  ouvrirDetail(publicite: MaPublicite): void {
    this.publiciteDetail.set(publicite);
  }

  fermerDetail(): void {
    this.publiciteDetail.set(null);
    this.erreurImage.set(null);
  }

  /**
   * Remplace l'image de couverture d'une campagne existante. Si elle était
   * active, le backend la repasse en validation admin : on relaie ce nouveau
   * statut dans le message de succès.
   */
  modifierImage(fichier: File): void {
    const publicite = this.publiciteDetail();
    if (!publicite || this.envoiImageEnCoursId()) {
      return;
    }
    this.envoiImageEnCoursId.set(publicite.id);
    this.erreurImage.set(null);

    this.service.changerImagePublicite(publicite.id, fichier).subscribe({
      next: (publiciteMaj) => {
        this.envoiImageEnCoursId.set(null);
        this.publicites.update((liste) => liste.map((p) => (p.id === publiciteMaj.id ? publiciteMaj : p)));
        this.publiciteDetail.set(publiciteMaj);
        this.messageSucces.set(
          publiciteMaj.statut === 'en_attente_validation'
            ? `Image mise à jour. La campagne repasse en validation par l'administration (statut : ${this.libellesStatut[publiciteMaj.statut]}).`
            : `Image mise à jour avec succès (statut : ${this.libellesStatut[publiciteMaj.statut]}).`,
        );
      },
      error: (erreur: unknown) => {
        this.envoiImageEnCoursId.set(null);
        this.erreurImage.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Reconduction ----

  demanderReconduction(publicite: MaPublicite): void {
    this.erreurReconduction.set(null);
    this.publiciteAReconduire.set(publicite);
  }

  annulerReconduction(): void {
    this.publiciteAReconduire.set(null);
  }

  confirmerReconduction(donnees: DonneesReconduction): void {
    const publicite = this.publiciteAReconduire();
    if (!publicite || this.reconductionEnCours()) {
      return;
    }
    this.reconductionEnCours.set(true);
    this.erreurReconduction.set(null);

    this.service.reconduirePublicite(publicite.id, donnees.formuleId, donnees.image).subscribe({
      next: (nouvellePublicite) => {
        this.reconductionEnCours.set(false);
        this.publiciteAReconduire.set(null);
        this.publicites.update((liste) => [nouvellePublicite, ...liste]);
        this.messageSucces.set(
          `Campagne "${nouvellePublicite.titre}" créée en brouillon — pensez à la soumettre.`,
        );
      },
      error: (erreur: unknown) => {
        this.reconductionEnCours.set(false);
        this.erreurReconduction.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Masquage (retrait des listes) ----

  demanderSuppression(publicite: MaPublicite): void {
    this.erreurSuppression.set(null);
    this.publiciteASupprimer.set(publicite);
  }

  annulerSuppression(): void {
    this.publiciteASupprimer.set(null);
  }

  confirmerSuppression(): void {
    const publicite = this.publiciteASupprimer();
    if (!publicite || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set(null);

    this.service.masquerPublicite(publicite.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.publiciteASupprimer.set(null);
        this.publicites.update((liste) => liste.filter((p) => p.id !== publicite.id));
        // Referme aussi le détail s'il était ouvert sur la campagne retirée.
        if (this.publiciteDetail()?.id === publicite.id) {
          this.fermerDetail();
        }
        this.messageSucces.set(`Campagne "${publicite.titre}" retirée de vos listes.`);
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set(extraireMessageErreur(erreur));
      },
    });
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

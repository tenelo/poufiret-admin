import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PublicitesAdminService } from '../publicites-admin.service';
import { SelecteurPartenaire, PartenaireChoisi } from '../../../../partage/selecteur-partenaire/selecteur-partenaire';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { extraireErreursFormulaire } from '../formules-parametres-pub/extraire-erreurs-champs';
import { OPTIONS_PORTEE, PorteePublicite } from '../../../../modeles/publicite.model';
import {
  OPTIONS_REGLEMENT_PUB_PARTENAIRE,
  PubliciteAdmin,
  QuotaFormule,
  ReglementPubPartenaire,
  ajouterJours,
} from '../../../../modeles/publicites-admin.model';

export type ModeDialogPubPartenaire = 'creation' | 'reconduction';

const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

function aujourdhuiIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fenêtre admin « Créer une pub pour un partenaire » / « Reconduire » (capacité
 * gerer_pubs_partenaires) : un seul formulaire pour les deux modes.
 * - Création : partenaire (recherche partagée), formule avec ses places restantes, titre,
 *   description, image de couverture, vidéo et portée facultatives.
 * - Reconduction : rappel de la campagne terminée, formule et image facultatives (sinon celles
 *   d'origine), étape de confirmation avant l'envoi.
 * Communs : date de début, date de fin préremplie (début + durée de la formule) et modifiable,
 * règlement obligatoire « Payée » / « Offerte », motif facultatif affiché pour « Offerte ».
 * Les erreurs du serveur (409 quota, 400 dates…) s'affichent telles quelles sans fermer la fenêtre.
 */
@Component({
  selector: 'app-dialog-pub-partenaire',
  imports: [SelecteurPartenaire],
  templateUrl: './dialog-pub-partenaire.html',
  styleUrls: [
    '../formules-parametres-pub/dialog-formule-pub/dialog-formule-pub.scss',
    './dialog-pub-partenaire.scss',
  ],
})
export class DialogPubPartenaire implements OnInit {
  private readonly service = inject(PublicitesAdminService);

  readonly mode = input<ModeDialogPubPartenaire>('creation');
  /** Campagne terminée à reconduire (mode reconduction). */
  readonly publicite = input<PubliciteAdmin | null>(null);
  /** Quotas des formules (déjà chargés par l'écran Campagnes). */
  readonly formules = input<QuotaFormule[]>([]);

  readonly annule = output<void>();
  /** Message de succès à afficher par l'écran parent (qui rafraîchit liste et quotas). */
  readonly reussi = output<string>();

  readonly optionsPortee = OPTIONS_PORTEE;
  readonly optionsReglement = OPTIONS_REGLEMENT_PUB_PARTENAIRE;

  readonly formulesActives = computed(() => this.formules().filter((f) => f.est_active));
  /** Durées (jours) lues sur GET /publicites/formules/ quand les quotas ne les donnent pas. */
  private readonly durees = signal<Record<string, number>>({});

  readonly partenaire = signal<PartenaireChoisi | null>(null);
  readonly formuleId = signal('');
  readonly titre = signal('');
  readonly description = signal('');
  readonly image = signal<File | null>(null);
  readonly video = signal<File | null>(null);
  readonly portee = signal<PorteePublicite | ''>('');
  readonly dateDebut = signal(aujourdhuiIso());
  readonly dateFin = signal('');
  readonly reglement = signal<ReglementPubPartenaire | ''>('');
  readonly motif = signal('');

  readonly etapeConfirmation = signal(false);
  readonly envoiEnCours = signal(false);
  readonly erreurGenerale = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  readonly estReconduction = computed(() => this.mode() === 'reconduction');

  /** Formule de référence pour la durée : celle choisie, sinon (reconduction) celle d'origine. */
  readonly formuleEffective = computed<QuotaFormule | null>(() => {
    const id = this.formuleId();
    if (id) return this.formules().find((f) => f.id === id) ?? null;
    return this.formuleOrigine();
  });

  readonly formuleOrigine = computed<QuotaFormule | null>(() => {
    const pub = this.publicite();
    if (!pub) return null;
    return (
      this.formules().find((f) => f.id === pub.formule_id || f.id === String(pub.formule) || f.nom === String(pub.formule)) ??
      null
    );
  });

  readonly dureeFormule = computed<number | null>(() => {
    const formule = this.formuleEffective();
    if (!formule) return null;
    return formule.duree_jours ?? this.durees()[formule.id] ?? null;
  });

  ngOnInit(): void {
    const sansDuree = this.formules().some((f) => f.duree_jours === undefined);
    if (sansDuree) {
      this.service.chargerDureesFormules().subscribe({
        next: (durees) => {
          this.durees.set(durees);
          this.preremplirDateFin();
        },
        error: () => undefined,
      });
    }
    this.preremplirDateFin();
  }

  libelleFormule(f: QuotaFormule): string {
    const places = f.places_restantes <= 0 ? 'complète' : `${f.places_restantes} place${f.places_restantes > 1 ? 's' : ''} restante${f.places_restantes > 1 ? 's' : ''}`;
    return `${f.nom} — ${places}`;
  }

  /** Date de fin = début + durée de la formule (si connue) ; reste modifiable à la main. */
  private preremplirDateFin(): void {
    const duree = this.dureeFormule();
    if (this.dateDebut() && duree !== null && !Number.isNaN(duree)) {
      this.dateFin.set(ajouterJours(this.dateDebut(), duree));
    }
  }

  changerFormule(id: string): void {
    this.formuleId.set(id);
    this.preremplirDateFin();
  }

  changerDateDebut(valeur: string): void {
    this.dateDebut.set(valeur);
    this.preremplirDateFin();
  }

  changerReglement(valeur: ReglementPubPartenaire): void {
    this.reglement.set(valeur);
    if (valeur !== 'offerte') this.motif.set('');
  }

  selectionnerFichier(evenement: Event, type: 'image' | 'video'): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0] ?? null;
    const erreurs = { ...this.erreursChamps() };
    delete erreurs[type === 'image' ? 'image_couverture' : 'video'];
    if (type === 'image' && fichier && fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      erreurs['image_couverture'] = "L'image ne doit pas dépasser 5 Mo.";
      champ.value = '';
      this.image.set(null);
    } else if (type === 'image') {
      this.image.set(fichier);
    } else {
      this.video.set(fichier);
    }
    this.erreursChamps.set(erreurs);
  }

  /** Champs obligatoires ; renvoie vrai si le formulaire peut partir. */
  private valider(): boolean {
    const erreurs: Record<string, string> = {};
    if (!this.estReconduction()) {
      if (!this.partenaire()) erreurs['partenaire'] = 'Choisissez un partenaire.';
      if (!this.formuleId()) erreurs['formule'] = 'Choisissez une formule.';
      if (!this.titre().trim()) erreurs['titre'] = 'Le titre est obligatoire.';
      if (!this.image()) erreurs['image_couverture'] = "L'image de couverture est obligatoire.";
    }
    if (!this.dateDebut()) erreurs['date_debut'] = 'La date de début est obligatoire.';
    if (!this.dateFin()) erreurs['date_fin'] = 'La date de fin est obligatoire.';
    if (!this.reglement()) erreurs['reglement'] = 'Indiquez si la pub est « Payée » ou « Offerte ».';
    this.erreursChamps.set(erreurs);
    return Object.keys(erreurs).length === 0;
  }

  soumettre(): void {
    if (this.envoiEnCours() || !this.valider()) return;
    this.erreurGenerale.set(null);
    if (this.estReconduction()) {
      // Reconduction : étape de confirmation avant l'envoi.
      this.etapeConfirmation.set(true);
      return;
    }
    this.envoyer();
  }

  retourFormulaire(): void {
    this.etapeConfirmation.set(false);
  }

  envoyer(): void {
    if (this.envoiEnCours()) return;
    const commun = {
      dateDebut: this.dateDebut(),
      dateFin: this.dateFin(),
      reglement: this.reglement() as ReglementPubPartenaire,
      motif: this.reglement() === 'offerte' ? this.motif().trim() || undefined : undefined,
    };

    let requete$: Observable<unknown>;
    const pub = this.publicite();
    if (this.estReconduction() && pub) {
      requete$ = this.service.reconduirePubPartenaire(pub.id, {
        ...commun,
        formuleId: this.formuleId() || undefined,
        imageCouverture: this.image() ?? undefined,
      });
    } else {
      requete$ = this.service.creerPubPartenaire({
        ...commun,
        partenaireId: this.partenaire()!.id,
        formuleId: this.formuleId(),
        titre: this.titre().trim(),
        description: this.description().trim() || undefined,
        imageCouverture: this.image()!,
        video: this.video() ?? undefined,
        portee: this.portee() || undefined,
      });
    }

    this.envoiEnCours.set(true);
    this.erreurGenerale.set(null);
    requete$.subscribe({
      next: () => {
        this.envoiEnCours.set(false);
        this.reussi.emit(
          this.estReconduction()
            ? `La campagne « ${pub?.titre ?? ''} » a été reconduite.`
            : `La pub « ${this.titre().trim()} » a été créée pour ${this.partenaire()?.nom ?? 'le partenaire'}.`,
        );
      },
      // Message du serveur tel quel ; la fenêtre reste ouverte (409 quota, 400 dates…).
      error: (erreur: unknown) => {
        this.envoiEnCours.set(false);
        this.etapeConfirmation.set(false);
        const formulaire = extraireErreursFormulaire(erreur);
        if (formulaire) {
          this.erreursChamps.set(formulaire.champs);
          this.erreurGenerale.set(formulaire.general ?? this.resumeChamps(formulaire.champs));
        } else {
          this.erreursChamps.set({});
          this.erreurGenerale.set(this.messageServeur(erreur));
        }
      },
    });
  }

  /** 400 sans message global : ses messages de champs, pour qu'aucun ne passe inaperçu. */
  private resumeChamps(champs: Record<string, string>): string {
    return Object.values(champs).join(' ');
  }

  private messageServeur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
      const corps = erreur.error;
      if (typeof corps?.message === 'string') return corps.message;
      if (typeof corps?.detail === 'string') return corps.detail;
      if (typeof corps?.erreur === 'string') return corps.erreur;
    }
    return extraireMessageErreur(erreur);
  }
}

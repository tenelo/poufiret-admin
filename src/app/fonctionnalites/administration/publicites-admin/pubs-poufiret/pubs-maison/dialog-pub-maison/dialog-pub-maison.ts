import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { PubsPoufiretService } from '../../pubs-poufiret.service';
import { extraireErreursFormulaire } from '../../../formules-parametres-pub/extraire-erreurs-champs';
import { extraireMessageErreur } from '../../../../tableau-de-bord-admin/extraire-message-erreur';
import { CategorieAdmin } from '../../../../../../modeles/categorie-admin.model';
import { OptionGeo } from '../../../../../../modeles/geographie.model';
import {
  OPTIONS_PORTEE_POUFIRET,
  PorteePubPoufiret,
  PubPoufiretAdmin,
} from '../../../../../../modeles/pub-poufiret.model';

const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Fenêtre de création/modification d'une pub Poufiret (pub maison du carrousel) : image, titre,
 * texte, catégorie cible (liste des catégories actives), dates facultatives, portée. `est_active`
 * n'est pas ici : bascule directement depuis la carte (comme la suppression).
 */
@Component({
  selector: 'app-dialog-pub-maison',
  imports: [],
  templateUrl: './dialog-pub-maison.html',
  // Mêmes styles que les autres fenêtres de Publicités (voile, modale, champs, boutons, erreurs).
  styleUrls: [
    '../../../formules-parametres-pub/dialog-formule-pub/dialog-formule-pub.scss',
    '../../../dialog-pub-partenaire/dialog-pub-partenaire.scss',
  ],
})
export class DialogPubMaison {
  private readonly service = inject(PubsPoufiretService);

  /** Pub à modifier ; absente = création. */
  readonly pub = input<PubPoufiretAdmin | null>(null);
  readonly categories = input<CategorieAdmin[]>([]);
  readonly regions = input<OptionGeo[]>([]);
  readonly departements = input<OptionGeo[]>([]);

  readonly annule = output<void>();
  readonly reussi = output<string>();

  readonly optionsPortee = OPTIONS_PORTEE_POUFIRET;
  readonly enEdition = computed(() => this.pub() !== null);

  readonly titre = signal('');
  readonly texte = signal('');
  readonly image = signal<File | null>(null);
  readonly categorieId = signal<number | null>(null);
  readonly dateDebut = signal('');
  readonly dateFin = signal('');
  readonly portee = signal<PorteePubPoufiret>('tout');
  readonly regionId = signal<number | null>(null);
  readonly departementId = signal<number | null>(null);

  readonly envoiEnCours = signal(false);
  readonly erreurGenerale = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  private preremplissageFait = false;

  constructor() {
    // `pub` (modification) n'est lu qu'une seule fois, à l'ouverture de la fenêtre : un nouveau
    // composant est créé à chaque ouverture (le formulaire ne doit pas se réinitialiser en cours
    // d'édition si l'objet source changeait pour une autre raison).
    effect(() => {
      const pub = this.pub();
      if (!pub || this.preremplissageFait) {
        return;
      }
      this.preremplissageFait = true;
      this.titre.set(pub.titre);
      this.texte.set(pub.texte);
      this.categorieId.set(pub.categorie);
      this.dateDebut.set(this.aDateSimple(pub.date_debut));
      this.dateFin.set(this.aDateSimple(pub.date_fin));
      this.portee.set(pub.portee);
      this.regionId.set(pub.region);
      this.departementId.set(pub.departement);
    });
  }

  private aDateSimple(iso: string | null | undefined): string {
    return iso ? iso.slice(0, 10) : '';
  }

  selectionnerImage(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0] ?? null;
    const erreurs = { ...this.erreursChamps() };
    delete erreurs['image_couverture'];
    if (fichier && fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      erreurs['image_couverture'] = "L'image ne doit pas dépasser 5 Mo.";
      champ.value = '';
      this.image.set(null);
    } else {
      this.image.set(fichier);
    }
    this.erreursChamps.set(erreurs);
  }

  changerPortee(valeur: string): void {
    this.portee.set(valeur as PorteePubPoufiret);
    if (valeur !== 'region') this.regionId.set(null);
    if (valeur !== 'departement') this.departementId.set(null);
  }

  private valider(): boolean {
    const erreurs: Record<string, string> = {};
    if (!this.titre().trim()) erreurs['titre'] = 'Le titre est obligatoire.';
    if (!this.categorieId()) erreurs['categorie'] = 'La catégorie cible est obligatoire.';
    if (!this.enEdition() && !this.image()) erreurs['image_couverture'] = "L'image est obligatoire.";
    if (this.portee() === 'region' && !this.regionId()) erreurs['region'] = 'Choisissez une région.';
    if (this.portee() === 'departement' && !this.departementId()) erreurs['departement'] = 'Choisissez un département.';
    this.erreursChamps.set(erreurs);
    return Object.keys(erreurs).length === 0;
  }

  soumettre(): void {
    if (this.envoiEnCours() || !this.valider()) return;
    this.envoiEnCours.set(true);
    this.erreurGenerale.set(null);

    const donnees = {
      titre: this.titre().trim(),
      texte: this.texte().trim(),
      imageCouverture: this.image() ?? undefined,
      categorie: this.categorieId()!,
      dateDebut: this.dateDebut() || null,
      dateFin: this.dateFin() || null,
      portee: this.portee(),
      region: this.portee() === 'region' ? this.regionId() : null,
      departement: this.portee() === 'departement' ? this.departementId() : null,
    };

    const pub = this.pub();
    const requete$ = pub ? this.service.modifierPub(pub.id, donnees) : this.service.creerPub(donnees);
    requete$.subscribe({
      next: (resultat) => {
        this.envoiEnCours.set(false);
        this.reussi.emit(pub ? `Pub « ${resultat.titre} » modifiée.` : `Pub « ${resultat.titre} » créée.`);
      },
      error: (erreur: unknown) => {
        this.envoiEnCours.set(false);
        const formulaire = extraireErreursFormulaire(erreur);
        if (formulaire) {
          this.erreursChamps.set(formulaire.champs);
          this.erreurGenerale.set(formulaire.general);
        } else {
          this.erreursChamps.set({});
          this.erreurGenerale.set(extraireMessageErreur(erreur));
        }
      },
    });
  }
}

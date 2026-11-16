import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { PubsPoufiretService } from '../../pubs-poufiret.service';
import { extraireErreursFormulaire } from '../../../formules-parametres-pub/extraire-erreurs-champs';
import { extraireMessageErreur } from '../../../../tableau-de-bord-admin/extraire-message-erreur';
import { CategorieAdmin } from '../../../../../../modeles/categorie-admin.model';
import { EcranDecouverteAdmin } from '../../../../../../modeles/pub-poufiret.model';

const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Fenêtre de création/modification d'un écran du parcours « Découvrir Poufiret » : image, titre,
 * texte, bouton facultatif (libellé + catégorie, les deux ensemble ou aucun des deux). `est_actif`
 * n'est pas ici : bascule directement depuis la liste (comme la suppression).
 */
@Component({
  selector: 'app-dialog-ecran-decouverte',
  imports: [],
  templateUrl: './dialog-ecran-decouverte.html',
  styleUrls: [
    '../../../formules-parametres-pub/dialog-formule-pub/dialog-formule-pub.scss',
    '../../../dialog-pub-partenaire/dialog-pub-partenaire.scss',
  ],
})
export class DialogEcranDecouverte {
  private readonly service = inject(PubsPoufiretService);

  /** Écran à modifier ; absent = création. */
  readonly ecran = input<EcranDecouverteAdmin | null>(null);
  readonly categories = input<CategorieAdmin[]>([]);

  readonly annule = output<void>();
  readonly reussi = output<string>();

  readonly enEdition = computed(() => this.ecran() !== null);

  readonly titre = signal('');
  readonly texte = signal('');
  readonly image = signal<File | null>(null);
  readonly boutonLibelle = signal('');
  readonly boutonCategorieId = signal<number | null>(null);

  readonly envoiEnCours = signal(false);
  readonly erreurGenerale = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  private preremplissageFait = false;

  constructor() {
    effect(() => {
      const ecran = this.ecran();
      if (!ecran || this.preremplissageFait) {
        return;
      }
      this.preremplissageFait = true;
      this.titre.set(ecran.titre);
      this.texte.set(ecran.texte);
      this.boutonLibelle.set(ecran.bouton_libelle);
      this.boutonCategorieId.set(ecran.bouton_categorie);
    });
  }

  selectionnerImage(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0] ?? null;
    const erreurs = { ...this.erreursChamps() };
    delete erreurs['image'];
    if (fichier && fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      erreurs['image'] = "L'image ne doit pas dépasser 5 Mo.";
      champ.value = '';
      this.image.set(null);
    } else {
      this.image.set(fichier);
    }
    this.erreursChamps.set(erreurs);
  }

  private valider(): boolean {
    const erreurs: Record<string, string> = {};
    if (!this.titre().trim()) erreurs['titre'] = 'Le titre est obligatoire.';
    if (!this.enEdition() && !this.image()) erreurs['image'] = "L'image est obligatoire.";
    const aLibelle = !!this.boutonLibelle().trim();
    const aCategorie = this.boutonCategorieId() !== null;
    if (aLibelle !== aCategorie) {
      erreurs['bouton_libelle'] = 'Le bouton demande un libellé ET une catégorie (ou aucun des deux).';
    }
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
      image: this.image() ?? undefined,
      boutonLibelle: this.boutonLibelle().trim(),
      boutonCategorie: this.boutonCategorieId(),
    };

    const ecran = this.ecran();
    const requete$ = ecran ? this.service.modifierEcran(ecran.id, donnees) : this.service.creerEcran(donnees);
    requete$.subscribe({
      next: (resultat) => {
        this.envoiEnCours.set(false);
        this.reussi.emit(ecran ? `Écran « ${resultat.titre} » modifié.` : `Écran « ${resultat.titre} » créé.`);
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

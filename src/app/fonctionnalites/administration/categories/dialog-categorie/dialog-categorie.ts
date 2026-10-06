import { Component, OnDestroy, OnInit, computed, input, output, signal } from '@angular/core';

import {
  CategorieAdmin,
  ErreursCategorieAdmin,
  RequeteCategorieAdmin,
  TypePartenaireCategorie,
} from '../../../../modeles/categorie-admin.model';

const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/**
 * Dialog de création/édition d'une catégorie. Ne fait pas l'appel réseau : émet le
 * corps de la requête, le parent gère l'appel et les erreurs (voir CategoriesAdmin).
 */
@Component({
  selector: 'app-dialog-categorie',
  imports: [],
  templateUrl: './dialog-categorie.html',
  styleUrl: './dialog-categorie.scss',
})
export class DialogCategorie implements OnInit, OnDestroy {
  /** Catégorie à modifier ; null = création. */
  readonly categorie = input<CategorieAdmin | null>(null);
  /** Parent préselectionné à l'ouverture (ex. "+ Sous-catégorie" sur une racine). */
  readonly parentInitial = input<number | null>(null);
  /** Catégories racines proposées comme parent (jamais une sous-catégorie : 2 niveaux max). */
  readonly racines = input<CategorieAdmin[]>([]);
  readonly typesPartenaire = input<TypePartenaireCategorie[]>([]);
  readonly enregistrementEnCours = input(false);
  readonly erreurs = input<ErreursCategorieAdmin | null>(null);

  readonly soumis = output<RequeteCategorieAdmin>();
  readonly annule = output<void>();

  readonly nom = signal('');
  readonly description = signal('');
  readonly icone = signal('');
  readonly parentId = signal<number | ''>('');
  readonly estActive = signal(true);
  readonly touche = signal(false);

  readonly typesSelectionnes = signal<Set<string>>(new Set());

  readonly motsCles = signal<string[]>([]);
  readonly texteMotCle = signal('');

  // Image : aperçu existant (URL serveur) ou local (nouveau fichier sélectionné).
  private apercuLocal: string | null = null;
  readonly apercuImage = signal<string | null>(null);
  readonly fichierImage = signal<File | null>(null);
  readonly imageRetiree = signal(false);
  readonly erreurImage = signal<string | null>(null);

  /** Racines proposables comme parent : jamais soi-même. */
  readonly racinesSelectionnables = computed(() => {
    const id = this.categorie()?.id;
    return this.racines().filter((r) => r.id !== id);
  });

  ngOnInit(): void {
    const categorie = this.categorie();
    if (categorie) {
      this.nom.set(categorie.nom);
      this.description.set(categorie.description);
      this.icone.set(categorie.icone ?? '');
      this.parentId.set(categorie.parent_id ?? '');
      this.estActive.set(categorie.est_active);
      this.typesSelectionnes.set(new Set(categorie.types_partenaire));
      this.motsCles.set([...categorie.mots_cles]);
      this.apercuImage.set(categorie.image);
    } else {
      this.parentId.set(this.parentInitial() ?? '');
    }
  }

  ngOnDestroy(): void {
    if (this.apercuLocal) {
      URL.revokeObjectURL(this.apercuLocal);
    }
  }

  /** Vrai si ce type est déjà revendiqué par une AUTRE catégorie que celle en édition. */
  estTypeIndisponible(type: TypePartenaireCategorie): boolean {
    return type.categorie_id !== null && type.categorie_id !== this.categorie()?.id;
  }

  basculerType(valeur: string): void {
    this.typesSelectionnes.update((ensemble) => {
      const copie = new Set(ensemble);
      if (copie.has(valeur)) {
        copie.delete(valeur);
      } else {
        copie.add(valeur);
      }
      return copie;
    });
  }

  changerTexteMotCle(valeur: string): void {
    this.texteMotCle.set(valeur);
  }

  surToucheMotCle(evenement: KeyboardEvent): void {
    if (evenement.key === 'Enter' || evenement.key === ',') {
      evenement.preventDefault();
      this.ajouterMotCle();
    }
  }

  ajouterMotCle(): void {
    const texte = this.texteMotCle().trim().replace(/,+$/, '').trim();
    if (!texte) {
      return;
    }
    this.motsCles.update((liste) => (liste.includes(texte) ? liste : [...liste, texte]));
    this.texteMotCle.set('');
  }

  supprimerMotCle(motCle: string): void {
    this.motsCles.update((liste) => liste.filter((m) => m !== motCle));
  }

  selectionnerImage(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';
    if (!fichier) {
      return;
    }

    this.erreurImage.set(null);
    if (!fichier.type.startsWith('image/')) {
      this.erreurImage.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.erreurImage.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    if (this.apercuLocal) {
      URL.revokeObjectURL(this.apercuLocal);
    }
    this.apercuLocal = URL.createObjectURL(fichier);
    this.fichierImage.set(fichier);
    this.imageRetiree.set(false);
    this.apercuImage.set(this.apercuLocal);
  }

  retirerImage(): void {
    if (this.apercuLocal) {
      URL.revokeObjectURL(this.apercuLocal);
      this.apercuLocal = null;
    }
    this.fichierImage.set(null);
    this.apercuImage.set(null);
    this.imageRetiree.set(true);
  }

  soumettre(): void {
    this.touche.set(true);
    const nom = this.nom().trim();
    if (!nom || this.enregistrementEnCours()) {
      return;
    }

    const corps: RequeteCategorieAdmin = {
      nom,
      description: this.description().trim(),
      icone: this.icone().trim(),
      parent_id: this.parentId() ? Number(this.parentId()) : null,
      est_active: this.estActive(),
      types_partenaire: [...this.typesSelectionnes()],
      mots_cles: this.motsCles(),
    };
    if (this.fichierImage()) {
      corps.image = this.fichierImage()!;
    } else if (this.imageRetiree()) {
      corps.supprimer_image = true;
    }

    this.soumis.emit(corps);
  }
}

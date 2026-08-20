import { Component, effect, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  ArticleDetail,
  OPTIONS_TYPE_ARTICLE,
  RequeteArticle,
  TypeArticle,
} from '../../../../modeles/article.model';
import { CategorieCatalogueAplatie } from '../../../../modeles/categorie-catalogue.model';

// Le prix promo, quand renseigné, ne doit pas dépasser le prix normal.
function validateurPrixPromotion(groupe: AbstractControl): ValidationErrors | null {
  const prix = groupe.get('prix')?.value;
  const promotion = groupe.get('prix_promotion')?.value;
  if (promotion !== null && promotion !== undefined && prix !== null && promotion > prix) {
    return { prixPromotionSuperieur: true };
  }
  return null;
}

/**
 * Formulaire de création/édition d'un article (catalogue partenaire). Affiché en overlay
 * par le composant parent. `article() === null` signifie une création.
 */
@Component({
  selector: 'app-formulaire-article',
  imports: [ReactiveFormsModule],
  templateUrl: './formulaire-article.html',
  styleUrl: './formulaire-article.scss',
})
export class FormulaireArticle {
  private readonly formBuilder = new FormBuilder();

  readonly categories = input.required<CategorieCatalogueAplatie[]>();
  readonly article = input<ArticleDetail | null>(null);
  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly soumis = output<RequeteArticle>();
  readonly annule = output<void>();

  readonly optionsTypeArticle = OPTIONS_TYPE_ARTICLE;

  readonly formulaire = this.formBuilder.group(
    {
      nom: ['', [Validators.required]],
      type: ['produit' as TypeArticle, [Validators.required]],
      categorie: [null as number | null, [Validators.required]],
      prix: [0, [Validators.required, Validators.min(0)]],
      prix_promotion: [null as number | null, [Validators.min(0)]],
      unite: [''],
      description: [''],
      details: [''],
      section_menu: [''],
      temps_preparation_min: [null as number | null, [Validators.min(0)]],
      est_actif: [true],
      est_disponible: [true],
      est_en_promotion: [false],
    },
    { validators: [validateurPrixPromotion] },
  );

  constructor() {
    effect(() => {
      const article = this.article();
      if (article) {
        this.formulaire.patchValue({
          nom: article.nom,
          type: article.type,
          categorie: article.categorie,
          prix: Number(article.prix),
          prix_promotion: article.prix_promotion !== null ? Number(article.prix_promotion) : null,
          unite: article.unite ?? '',
          description: article.description ?? '',
          details: article.details ?? '',
          section_menu: article.section_menu ?? '',
          temps_preparation_min: article.temps_preparation_min,
          est_actif: article.est_actif,
          est_disponible: article.est_disponible,
          est_en_promotion: article.est_en_promotion,
        });
      } else {
        this.formulaire.reset({
          nom: '',
          type: 'produit',
          categorie: null,
          prix: 0,
          prix_promotion: null,
          unite: '',
          description: '',
          details: '',
          section_menu: '',
          temps_preparation_min: null,
          est_actif: true,
          est_disponible: true,
          est_en_promotion: false,
        });
      }
    });
  }

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    const donnees: RequeteArticle = {
      nom: valeurs.nom!,
      description: valeurs.description ?? '',
      type: valeurs.type!,
      prix: valeurs.prix!,
      prix_promotion: valeurs.prix_promotion,
      unite: valeurs.unite ?? '',
      details: valeurs.details ?? '',
      est_actif: valeurs.est_actif!,
      est_disponible: valeurs.est_disponible!,
      est_en_promotion: valeurs.est_en_promotion!,
      temps_preparation_min: valeurs.temps_preparation_min,
      categorie: valeurs.categorie!,
      section_menu: valeurs.section_menu ?? '',
    };

    this.soumis.emit(donnees);
  }
}

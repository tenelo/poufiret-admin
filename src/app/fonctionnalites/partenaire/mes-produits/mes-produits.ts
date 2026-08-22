import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { MesProduitsService } from './mes-produits.service';
import { ProfilPartenaireService } from '../mon-profil/profil-partenaire.service';
import { MesCategoriesService } from '../mes-categories/mes-categories.service';
import { FormulaireArticle } from './formulaire-article/formulaire-article';
import { GestionImages } from './gestion-images/gestion-images';
import { extraireMessageErreur } from './extraire-message-erreur';
import { ArticleDetail, ArticleListe, RequeteArticle } from '../../../modeles/article.model';
import { ProfilPartenaire } from '../../../modeles/profil-partenaire.model';
import { MaCategorie } from '../../../modeles/ma-categorie.model';
import { CategorieCatalogueAplatie } from '../../../modeles/categorie-catalogue.model';

// Identifiant fictif de l'onglet regroupant les articles sans catégorie du
// partenaire correspondante (robustesse : ne jamais coïncider avec un id réel).
const ID_ONGLET_SANS_CATEGORIE = -1;

interface OngletProduits {
  id: number;
  libelle: string;
  icone: string | null;
  articles: ArticleListe[];
}

/**
 * Page "Mes produits" de l'espace partenaire : CRUD des articles du catalogue et
 * gestion de leurs images, regroupés en onglets par catégorie du partenaire. Ne
 * couvre pas les sous-ressources spécialisées (variantes, suppléments, panoramas,
 * vidéos, logement, véhicule) — écrans dédiés à venir.
 */
@Component({
  selector: 'app-mes-produits',
  imports: [FormulaireArticle, GestionImages],
  templateUrl: './mes-produits.html',
  styleUrl: './mes-produits.scss',
})
export class MesProduits implements OnInit {
  private readonly profilPartenaireService = inject(ProfilPartenaireService);
  private readonly mesProduitsService = inject(MesProduitsService);
  private readonly mesCategoriesService = inject(MesCategoriesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly profil = signal<ProfilPartenaire | null>(null);
  readonly mesCategories = signal<MaCategorie[]>([]);
  readonly articles = signal<ArticleListe[]>([]);

  readonly quotaArticlesAtteint = computed(() => {
    const profil = this.profil();
    return profil !== null && this.articles().length >= profil.nb_articles_max;
  });

  // ---- Onglets par catégorie ----

  readonly onglets = computed<OngletProduits[]>(() => {
    const categories = this.mesCategories();
    const parCategorie = new Map<number, ArticleListe[]>();
    const sansCategorie: ArticleListe[] = [];
    const idsConnus = new Set(categories.map((c) => c.categorie));

    for (const article of this.articles()) {
      if (article.categorie !== null && idsConnus.has(article.categorie)) {
        const liste = parCategorie.get(article.categorie) ?? [];
        liste.push(article);
        parCategorie.set(article.categorie, liste);
      } else {
        sansCategorie.push(article);
      }
    }

    const items: OngletProduits[] = categories.map((c) => ({
      id: c.categorie,
      libelle: c.categorie_nom,
      icone: c.categorie_icone,
      articles: parCategorie.get(c.categorie) ?? [],
    }));

    // Onglet de robustesse, uniquement si des articles y sont effectivement rattachés.
    if (sansCategorie.length > 0) {
      items.push({
        id: ID_ONGLET_SANS_CATEGORIE,
        libelle: 'Sans catégorie',
        icone: null,
        articles: sansCategorie,
      });
    }

    return items;
  });

  readonly ongletActifId = signal<number | null>(null);

  readonly ongletActif = computed(
    () => this.onglets().find((o) => o.id === this.ongletActifId()) ?? this.onglets()[0] ?? null,
  );

  /** Catégories du partenaire, au format attendu par le sélecteur du formulaire (pas d'arbre : une seule profondeur). */
  readonly categoriesFormulaire = computed<CategorieCatalogueAplatie[]>(() =>
    this.mesCategories().map((c) => ({ id: c.categorie, libelle: c.categorie_nom, profondeur: 0 })),
  );

  /** Catégorie à pré-sélectionner à la création, depuis l'onglet actif ("Sans catégorie" exclu). */
  readonly categorieParDefaut = computed(() => {
    const actif = this.ongletActif();
    return actif && actif.id !== ID_ONGLET_SANS_CATEGORIE ? actif.id : null;
  });

  readonly formulaireOuvert = signal(false);
  readonly articleEnEdition = signal<ArticleDetail | null>(null);
  readonly chargementDetailEnCours = signal(false);
  readonly enregistrementEnCours = signal(false);
  readonly messageErreurFormulaire = signal<string | null>(null);

  readonly articleAConfirmerSuppression = signal<ArticleListe | null>(null);
  readonly suppressionEnCours = signal(false);

  readonly articleImagesOuvert = signal<ArticleListe | null>(null);

  constructor() {
    // Sélectionne le premier onglet dès que les catégories/articles sont chargés
    // (aucun onglet actif choisi explicitement pour l'instant).
    effect(() => {
      const onglets = this.onglets();
      if (this.ongletActifId() === null && onglets.length > 0) {
        this.ongletActifId.set(onglets[0].id);
      }
    });
  }

  ngOnInit(): void {
    this.chargerDonneesInitiales();
  }

  chargerDonneesInitiales(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.profilPartenaireService.chargerProfil().subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargerArticlesEtCategories();
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  chargerArticlesEtCategories(): void {
    const partenaireId = this.profil()?.id;
    if (!partenaireId) {
      return;
    }

    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    forkJoin({
      articles: this.mesProduitsService.listerTousLesArticles(partenaireId),
      categories: this.mesCategoriesService.listerMesCategories(),
    }).subscribe({
      next: ({ articles, categories }) => {
        this.chargementEnCours.set(false);
        this.articles.set(articles);
        this.mesCategories.set(categories);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerOnglet(id: number): void {
    this.ongletActifId.set(id);
  }

  ouvrirCreation(): void {
    if (this.quotaArticlesAtteint()) {
      return;
    }
    this.articleEnEdition.set(null);
    this.messageErreurFormulaire.set(null);
    this.formulaireOuvert.set(true);
  }

  ouvrirEdition(article: ArticleListe): void {
    this.messageErreur.set(null);
    this.chargementDetailEnCours.set(true);

    this.mesProduitsService.obtenirArticle(article.slug).subscribe({
      next: (detail) => {
        this.chargementDetailEnCours.set(false);
        this.articleEnEdition.set(detail);
        this.messageErreurFormulaire.set(null);
        this.formulaireOuvert.set(true);
      },
      error: (erreur: unknown) => {
        this.chargementDetailEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  fermerFormulaire(): void {
    this.formulaireOuvert.set(false);
    this.articleEnEdition.set(null);
    this.messageErreurFormulaire.set(null);
  }

  soumettreFormulaire(donnees: RequeteArticle): void {
    this.enregistrementEnCours.set(true);
    this.messageErreurFormulaire.set(null);

    const enEdition = this.articleEnEdition();
    const requete = enEdition
      ? this.mesProduitsService.modifierArticle(enEdition.slug, donnees)
      : this.mesProduitsService.creerArticle(donnees);

    requete.subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.messageSucces.set(
          enEdition ? 'Article modifié avec succès.' : 'Article créé avec succès.',
        );
        this.fermerFormulaire();
        this.chargerArticlesEtCategories();
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreurFormulaire.set(extraireMessageErreur(erreur));
      },
    });
  }

  demanderSuppression(article: ArticleListe): void {
    this.articleAConfirmerSuppression.set(article);
  }

  annulerSuppression(): void {
    this.articleAConfirmerSuppression.set(null);
  }

  confirmerSuppression(): void {
    const article = this.articleAConfirmerSuppression();
    if (!article) {
      return;
    }

    this.suppressionEnCours.set(true);
    this.messageErreur.set(null);

    this.mesProduitsService.supprimerArticle(article.slug).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.articleAConfirmerSuppression.set(null);
        this.messageSucces.set('Article supprimé avec succès.');
        this.chargerArticlesEtCategories();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  ouvrirImages(article: ArticleListe): void {
    this.articleImagesOuvert.set(article);
  }

  fermerImages(): void {
    this.articleImagesOuvert.set(null);
    this.chargerArticlesEtCategories();
  }
}

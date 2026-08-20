import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { MesProduitsService } from './mes-produits.service';
import { ProfilPartenaireService } from '../mon-profil/profil-partenaire.service';
import { FormulaireArticle } from './formulaire-article/formulaire-article';
import { GestionImages } from './gestion-images/gestion-images';
import { extraireMessageErreur } from './extraire-message-erreur';
import { ArticleDetail, ArticleListe, RequeteArticle } from '../../../modeles/article.model';
import { ProfilPartenaire } from '../../../modeles/profil-partenaire.model';
import { CategorieCatalogueAplatie, aplatirCategories } from '../../../modeles/categorie-catalogue.model';

/**
 * Page "Mes produits" de l'espace partenaire : CRUD des articles du catalogue et
 * gestion de leurs images. Ne couvre pas les sous-ressources spécialisées (variantes,
 * suppléments, panoramas, vidéos, logement, véhicule) — écrans dédiés à venir.
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

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly profil = signal<ProfilPartenaire | null>(null);
  readonly categoriesAplaties = signal<CategorieCatalogueAplatie[]>([]);

  readonly articles = signal<ArticleListe[]>([]);
  readonly totalArticles = signal(0);
  readonly pageCourante = signal(1);
  readonly pagePrecedenteDisponible = signal(false);
  readonly pageSuivanteDisponible = signal(false);

  readonly quotaArticlesAtteint = computed(() => {
    const profil = this.profil();
    return profil !== null && this.totalArticles() >= profil.nb_articles_max;
  });

  readonly formulaireOuvert = signal(false);
  readonly articleEnEdition = signal<ArticleDetail | null>(null);
  readonly chargementDetailEnCours = signal(false);
  readonly enregistrementEnCours = signal(false);
  readonly messageErreurFormulaire = signal<string | null>(null);

  readonly articleAConfirmerSuppression = signal<ArticleListe | null>(null);
  readonly suppressionEnCours = signal(false);

  readonly articleImagesOuvert = signal<ArticleListe | null>(null);

  ngOnInit(): void {
    this.chargerDonneesInitiales();
  }

  chargerDonneesInitiales(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.profilPartenaireService.chargerProfil().subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargerArticles(1);
        this.chargerCategories();
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  chargerArticles(page: number): void {
    const partenaireId = this.profil()?.id;
    if (!partenaireId) {
      return;
    }

    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.mesProduitsService.listerMesArticles(partenaireId, page).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.articles.set(reponse.results);
        this.totalArticles.set(reponse.count);
        this.pageCourante.set(page);
        this.pagePrecedenteDisponible.set(reponse.previous !== null);
        this.pageSuivanteDisponible.set(reponse.next !== null);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private chargerCategories(): void {
    this.mesProduitsService.listerCategories().subscribe({
      next: (categories) => this.categoriesAplaties.set(aplatirCategories(categories)),
      error: () => {
        // Non bloquant pour la liste des articles : le sélecteur de catégorie
        // du formulaire sera simplement vide si cet appel échoue.
      },
    });
  }

  pagePrecedente(): void {
    if (this.pagePrecedenteDisponible()) {
      this.chargerArticles(this.pageCourante() - 1);
    }
  }

  pageSuivante(): void {
    if (this.pageSuivanteDisponible()) {
      this.chargerArticles(this.pageCourante() + 1);
    }
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
        this.chargerArticles(enEdition ? this.pageCourante() : 1);
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
        const pageCible =
          this.articles().length === 1 && this.pageCourante() > 1
            ? this.pageCourante() - 1
            : this.pageCourante();
        this.chargerArticles(pageCible);
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
    this.chargerArticles(this.pageCourante());
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, forkJoin, map, of, reduce, switchMap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { ProfilPartenaireService } from '../mon-profil/profil-partenaire.service';
import { MesProduitsService } from '../mes-produits/mes-produits.service';
import { MesCommandesService } from '../mes-commandes/mes-commandes.service';
import { ArticleListe } from '../../../modeles/article.model';
import { ProfilPartenaire } from '../../../modeles/profil-partenaire.model';
import { Commande } from '../../../modeles/commande.model';
import { aplatirCategories } from '../../../modeles/categorie-catalogue.model';
import { ReponsePaginee } from '../../../modeles/pagination.model';
import {
  LigneProduitStats,
  PointNommee,
  StatsVuesPartenaire,
  VueCommandesPartenaire,
  VueEnsemblePartenaire,
  VueProduitsPartenaire,
  VueTableauDeBordPartenaire,
} from '../../../modeles/tableau-de-bord-partenaire.model';
import { cleMois, libelleMois } from './formatage';

// Statuts de commande considérés comme "livrés" pour le CA et les KPIs.
const STATUT_LIVREE = 'livree';

interface DonneesBrutesTableauDeBord {
  profil: ProfilPartenaire;
  statsVues: StatsVuesPartenaire;
  articles: ArticleListe[];
  categories: Map<number, string>;
  commandes: Commande[];
}

/**
 * Orchestre les appels nécessaires au tableau de bord partenaire et expose
 * des view-models déjà agrégés (aucun calcul métier dans les composants).
 */
@Injectable({ providedIn: 'root' })
export class TableauDeBordPartenaireService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);
  private readonly profilPartenaireService = inject(ProfilPartenaireService);
  private readonly mesProduitsService = inject(MesProduitsService);
  private readonly mesCommandesService = inject(MesCommandesService);

  chargerTableauDeBord(): Observable<VueTableauDeBordPartenaire> {
    return this.profilPartenaireService.chargerProfil().pipe(
      switchMap((profil) =>
        forkJoin({
          profil: of(profil),
          statsVues: this.chargerStatsVues(),
          articles: this.listerTousLesArticles(profil.id),
          categories: this.mesProduitsService
            .listerCategories()
            .pipe(map((categories) => new Map(aplatirCategories(categories).map((c) => [c.id, c.libelle])))),
          commandes: this.mesCommandesService.listerCommandesPartenaire(),
        }),
      ),
      map((donnees) => this.construireVue(donnees)),
    );
  }

  private chargerStatsVues(): Observable<StatsVuesPartenaire> {
    return this.http.get<StatsVuesPartenaire>(
      `${this.configuration.apiUrl}/catalogue/partenaire/stats-vues/`,
    );
  }

  /** Récupère toutes les pages d'articles du partenaire en bouclant sur `next`. */
  private listerTousLesArticles(partenaireId: number): Observable<ArticleListe[]> {
    return this.mesProduitsService.listerMesArticles(partenaireId, 1).pipe(
      expand((reponse) => {
        const pageSuivante = reponse.next ? this.extrairePage(reponse.next) : null;
        return pageSuivante
          ? this.mesProduitsService.listerMesArticles(partenaireId, pageSuivante)
          : EMPTY;
      }),
      reduce<ReponsePaginee<ArticleListe>, ArticleListe[]>(
        (tous, reponse) => [...tous, ...reponse.results],
        [],
      ),
    );
  }

  private extrairePage(urlSuivante: string): number | null {
    try {
      const page = new URL(urlSuivante).searchParams.get('page');
      return page ? Number(page) : null;
    } catch {
      return null;
    }
  }

  private construireVue(donnees: DonneesBrutesTableauDeBord): VueTableauDeBordPartenaire {
    return {
      ensemble: this.construireEnsemble(donnees),
      produits: this.construireProduits(donnees),
      commandes: this.construireCommandes(donnees),
    };
  }

  private construireEnsemble(donnees: DonneesBrutesTableauDeBord): VueEnsemblePartenaire {
    const { profil, statsVues, articles, commandes } = donnees;

    const likesCumules = articles.reduce((total, a) => total + a.nb_likes, 0);
    const commandesLivrees = commandes.filter((c) => c.statut === STATUT_LIVREE);
    const caLivre = commandesLivrees.reduce((total, c) => total + Number(c.total), 0);

    let joursAvantExpiration: number | null = null;
    if (profil.abonnement_fin) {
      const diffMs = new Date(profil.abonnement_fin).getTime() - Date.now();
      joursAvantExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      vuesProfil: profil.nb_vues,
      vuesCatalogue: statsVues.total_vues,
      nbProduits: articles.length,
      nbProduitsMax: profil.nb_articles_max,
      progressionProduits:
        profil.nb_articles_max > 0
          ? Math.min(100, Math.round((articles.length / profil.nb_articles_max) * 100))
          : null,
      likesCumules,
      commandesTotales: commandes.length,
      caLivre,
      planLibelle: profil.plan_libelle,
      abonnementFin: profil.abonnement_fin,
      joursAvantExpiration,
      expirationProche: joursAvantExpiration !== null && joursAvantExpiration >= 0 && joursAvantExpiration < 15,
      expirationDepassee: joursAvantExpiration !== null && joursAvantExpiration < 0,
      statutLibelle: profil.statut_libelle,
      estVisible: profil.est_visible,
      badgeCertifie: profil.badge_certifie,
      estFaveur: profil.est_faveur,
    };
  }

  private construireProduits(donnees: DonneesBrutesTableauDeBord): VueProduitsPartenaire {
    const { statsVues, articles, categories } = donnees;

    const parId = new Map(articles.map((a) => [a.id, a]));

    const lignes: LigneProduitStats[] = statsVues.articles.map((stat) => {
      const article = parId.get(stat.article_id);
      return {
        id: stat.article_id,
        nom: stat.nom,
        vuesTotal: stat.total,
        vuesJour: stat.jour,
        vuesSemaine: stat.semaine,
        vuesMois: stat.mois,
        likes: article?.nb_likes ?? 0,
        prix: article?.prix ?? '—',
        estDisponible: article?.est_disponible ?? stat.est_actif,
      };
    });
    lignes.sort((a, b) => b.vuesTotal - a.vuesTotal);

    const top10ParVues: PointNommee[] = lignes
      .slice(0, 10)
      .map((l) => ({ libelle: l.nom, valeur: l.vuesTotal }));

    const vuesParCategorie = new Map<number | null, number>();
    for (const article of articles) {
      vuesParCategorie.set(
        article.categorie,
        (vuesParCategorie.get(article.categorie) ?? 0) + article.nb_vues,
      );
    }
    const repartitionParCategorie: PointNommee[] = [...vuesParCategorie.entries()]
      .map(([categorieId, valeur]) => ({
        libelle: categorieId !== null ? (categories.get(categorieId) ?? 'Catégorie inconnue') : 'Sans catégorie',
        valeur,
      }))
      .filter((point) => point.valeur > 0)
      .sort((a, b) => b.valeur - a.valeur);

    return { lignes, top10ParVues, repartitionParCategorie };
  }

  private construireCommandes(donnees: DonneesBrutesTableauDeBord): VueCommandesPartenaire {
    const { commandes } = donnees;

    const parStatut = new Map<string, number>();
    const parModeLivraisonMap = new Map<string, number>();
    for (const commande of commandes) {
      parStatut.set(commande.statut, (parStatut.get(commande.statut) ?? 0) + 1);
      parModeLivraisonMap.set(
        commande.mode_livraison,
        (parModeLivraisonMap.get(commande.mode_livraison) ?? 0) + 1,
      );
    }

    const commandesLivrees = commandes.filter((c) => c.statut === STATUT_LIVREE);
    const caLivre = commandesLivrees.reduce((total, c) => total + Number(c.total), 0);
    const panierMoyen = commandesLivrees.length > 0 ? caLivre / commandesLivrees.length : 0;

    const caParMoisMap = new Map<string, number>();
    for (const commande of commandesLivrees) {
      const cle = cleMois(commande.livree_le ?? commande.created_at);
      caParMoisMap.set(cle, (caParMoisMap.get(cle) ?? 0) + Number(commande.total));
    }
    const caParMois: PointNommee[] = [...caParMoisMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cle, valeur]) => ({ libelle: libelleMois(cle), valeur }));

    // Taux d'acceptation : parmi les commandes ayant reçu une décision (acceptée
    // à un moment donné, ou refusée), la part de celles effectivement acceptées.
    const nbRefusees = commandes.filter((c) => c.statut === 'refusee').length;
    const nbAcceptees = commandes.filter((c) => c.acceptee_le !== null).length;
    const nbAvecDecision = nbRefusees + nbAcceptees;
    const tauxAcceptation = nbAvecDecision > 0 ? Math.round((nbAcceptees / nbAvecDecision) * 100) : null;

    const libellesStatut: Record<string, string> = {
      nouvelle: 'Nouvelle',
      acceptee: 'Acceptée',
      refusee: 'Refusée',
      en_preparation: 'En préparation',
      prete: 'Prête',
      en_livraison: 'En livraison',
      livree: 'Livrée',
      annulee: 'Annulée',
      expiree: 'Expirée',
    };
    const libellesMode: Record<string, string> = {
      emporter: 'À emporter',
      sur_place: 'Sur place',
      livraison: 'Livraison',
    };

    return {
      commandesTotales: commandes.length,
      repartitionParStatut: [...parStatut.entries()].map(([statut, valeur]) => ({
        libelle: libellesStatut[statut] ?? statut,
        valeur,
      })),
      caParMois,
      parModeLivraison: [...parModeLivraisonMap.entries()].map(([mode, valeur]) => ({
        libelle: libellesMode[mode] ?? mode,
        valeur,
      })),
      panierMoyen,
      tauxAcceptation,
    };
  }
}

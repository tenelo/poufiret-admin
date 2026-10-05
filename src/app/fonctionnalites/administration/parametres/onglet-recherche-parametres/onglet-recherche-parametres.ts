import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';

import { ParametresRechercheService } from '../parametres-recherche.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  CategorieMotsCles,
  CompteursRechercheSansResultat,
  FiltreStatutRechercheSansResultat,
  RechercheSansResultat,
  ResultatTestRecherche,
} from '../../../../modeles/parametres-recherche.model';

const DUREE_MESSAGE_MS = 4000;

interface CategorieAplatie {
  id: number;
  nom: string;
  profondeur: number;
}

interface GroupeMotsCles {
  categorie: CategorieMotsCles;
  enfants: CategorieMotsCles[];
}

/**
 * Onglet "Recherche" de Paramètres (capacité gerer_parametres) : trois blocs —
 * recherches sans résultat à traiter, dictionnaire de mots-clés par catégorie,
 * et un testeur pour vérifier l'effet d'un mot-clé sur les résultats de recherche.
 */
@Component({
  selector: 'app-onglet-recherche-parametres',
  imports: [NgTemplateOutlet, DatePipe],
  templateUrl: './onglet-recherche-parametres.html',
  styleUrl: './onglet-recherche-parametres.scss',
})
export class OngletRechercheParametres implements OnInit {
  private readonly service = inject(ParametresRechercheService);

  readonly message = signal<{ texte: string; erreur: boolean } | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Bloc "Recherches sans résultat" ----

  readonly recherches = signal<RechercheSansResultat[]>([]);
  readonly compteurs = signal<CompteursRechercheSansResultat | null>(null);
  readonly chargementRecherches = signal(true);
  readonly erreurRecherches = signal<string | null>(null);

  readonly filtreStatut = signal<FiltreStatutRechercheSansResultat>('a_traiter');
  readonly optionsStatut: { valeur: FiltreStatutRechercheSansResultat; libelle: string }[] = [
    { valeur: 'a_traiter', libelle: 'À traiter' },
    { valeur: 'traite', libelle: 'Traités' },
    { valeur: 'ignore', libelle: 'Ignorés' },
    { valeur: 'tous', libelle: 'Tous' },
  ];
  readonly filtreDu = signal('');
  readonly filtreAu = signal('');

  readonly traitementEnCoursId = signal<number | null>(null);

  // Dialog "Ajouter comme mot-clé à…".
  readonly rechercheEnAjout = signal<RechercheSansResultat | null>(null);
  readonly categorieChoisieId = signal<number | ''>('');

  // ---- Bloc "Mots-clés par catégorie" ----

  readonly categories = signal<CategorieMotsCles[]>([]);
  readonly chargementCategories = signal(true);
  readonly erreurCategories = signal<string | null>(null);

  readonly groupes = computed<GroupeMotsCles[]>(() => {
    const toutes = this.categories();
    return toutes
      .filter((c) => c.parent_id === null)
      .map((racine) => ({ categorie: racine, enfants: toutes.filter((c) => c.parent_id === racine.id) }));
  });

  readonly categoriesAplaties = computed<CategorieAplatie[]>(() => {
    const toutes = this.categories();
    const parcourir = (parentId: number | null, profondeur: number): CategorieAplatie[] =>
      toutes
        .filter((c) => c.parent_id === parentId)
        .flatMap((c) => [{ id: c.id, nom: c.nom, profondeur }, ...parcourir(c.id, profondeur + 1)]);
    return parcourir(null, 0);
  });

  readonly parentsDeplies = signal<Set<number>>(new Set());

  readonly brouillonMotsCles = signal<Record<number, string[]>>({});
  readonly texteSaisieMotCle = signal<Record<number, string>>({});
  readonly enregistrementMotsClesEnCoursId = signal<number | null>(null);
  readonly erreurMotsClesParCategorie = signal<Record<number, string | null>>({});

  // ---- Bloc "Tester la recherche" ----

  readonly texteTest = signal('');
  readonly resultatTest = signal<ResultatTestRecherche | null>(null);
  readonly chargementTest = signal(false);
  readonly erreurTest = signal<string | null>(null);

  ngOnInit(): void {
    this.chargerRecherches();
    this.chargerCategories();
  }

  // ---- Recherches sans résultat ----

  chargerRecherches(): void {
    this.chargementRecherches.set(true);
    this.erreurRecherches.set(null);

    this.service
      .listerSansResultat({
        statut: this.filtreStatut(),
        du: this.filtreDu() || undefined,
        au: this.filtreAu() || undefined,
      })
      .subscribe({
        next: (reponse) => {
          this.chargementRecherches.set(false);
          this.recherches.set(reponse.resultats);
          this.compteurs.set(reponse.compteurs);
        },
        error: (erreur: unknown) => {
          this.chargementRecherches.set(false);
          this.erreurRecherches.set(extraireMessageErreur(erreur));
        },
      });
  }

  changerFiltreStatut(valeur: string): void {
    this.filtreStatut.set(valeur as FiltreStatutRechercheSansResultat);
    this.chargerRecherches();
  }

  changerFiltreDu(valeur: string): void {
    this.filtreDu.set(valeur);
    this.chargerRecherches();
  }

  changerFiltreAu(valeur: string): void {
    this.filtreAu.set(valeur);
    this.chargerRecherches();
  }

  ouvrirAjoutMotCle(recherche: RechercheSansResultat): void {
    this.rechercheEnAjout.set(recherche);
    this.categorieChoisieId.set('');
  }

  fermerAjoutMotCle(): void {
    this.rechercheEnAjout.set(null);
  }

  changerCategorieChoisie(valeur: string): void {
    this.categorieChoisieId.set(valeur ? Number(valeur) : '');
  }

  confirmerAjoutMotCle(): void {
    const recherche = this.rechercheEnAjout();
    const categorieId = this.categorieChoisieId();
    if (!recherche || !categorieId || this.traitementEnCoursId() !== null) {
      return;
    }

    this.traitementEnCoursId.set(recherche.id);
    this.service.traiter(recherche.id, { action: 'ajouter_mot_cle', categorie_id: categorieId }).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.rechercheEnAjout.set(null);
        this.afficherMessage(`« ${recherche.terme} » ajouté comme mot-clé.`, false);
        this.chargerRecherches();
        this.chargerCategories();
      },
      error: (erreur: unknown) => {
        this.traitementEnCoursId.set(null);
        this.afficherMessage(extraireMessageErreur(erreur), true);
      },
    });
  }

  ignorer(recherche: RechercheSansResultat): void {
    if (this.traitementEnCoursId() !== null) {
      return;
    }
    this.traitementEnCoursId.set(recherche.id);
    this.service.traiter(recherche.id, { action: 'ignorer' }).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.afficherMessage(`« ${recherche.terme} » ignoré.`, false);
        this.chargerRecherches();
      },
      error: (erreur: unknown) => {
        this.traitementEnCoursId.set(null);
        this.afficherMessage(extraireMessageErreur(erreur), true);
      },
    });
  }

  // ---- Mots-clés par catégorie ----

  chargerCategories(): void {
    this.chargementCategories.set(true);
    this.erreurCategories.set(null);

    this.service.listerCategoriesMotsCles().subscribe({
      next: (categories) => {
        this.chargementCategories.set(false);
        this.categories.set(categories);
        this.brouillonMotsCles.set(
          Object.fromEntries(categories.map((c) => [c.id, [...c.mots_cles]])),
        );
      },
      error: (erreur: unknown) => {
        this.chargementCategories.set(false);
        this.erreurCategories.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerDeplie(id: number): void {
    this.parentsDeplies.update((s) => {
      const copie = new Set(s);
      if (copie.has(id)) {
        copie.delete(id);
      } else {
        copie.add(id);
      }
      return copie;
    });
  }

  estDeplie(id: number): boolean {
    return this.parentsDeplies().has(id);
  }

  motsClesPour(id: number): string[] {
    return this.brouillonMotsCles()[id] ?? [];
  }

  texteMotCle(id: number): string {
    return this.texteSaisieMotCle()[id] ?? '';
  }

  changerTexteMotCle(id: number, valeur: string): void {
    this.texteSaisieMotCle.update((s) => ({ ...s, [id]: valeur }));
  }

  surToucheMotCle(id: number, evenement: KeyboardEvent): void {
    if (evenement.key === 'Enter' || evenement.key === ',') {
      evenement.preventDefault();
      this.ajouterMotCle(id);
    }
  }

  ajouterMotCle(id: number): void {
    const texte = (this.texteSaisieMotCle()[id] ?? '').trim().replace(/,+$/, '').trim();
    if (!texte) {
      return;
    }
    this.brouillonMotsCles.update((s) => {
      const actuels = s[id] ?? [];
      if (actuels.includes(texte)) {
        return s;
      }
      return { ...s, [id]: [...actuels, texte] };
    });
    this.texteSaisieMotCle.update((s) => ({ ...s, [id]: '' }));
  }

  supprimerMotCle(id: number, motCle: string): void {
    this.brouillonMotsCles.update((s) => ({ ...s, [id]: (s[id] ?? []).filter((m) => m !== motCle) }));
  }

  erreurMotsCles(id: number): string | null {
    return this.erreurMotsClesParCategorie()[id] ?? null;
  }

  enregistrerMotsCles(categorie: CategorieMotsCles): void {
    if (this.enregistrementMotsClesEnCoursId() !== null) {
      return;
    }
    this.enregistrementMotsClesEnCoursId.set(categorie.id);
    this.erreurMotsClesParCategorie.update((s) => ({ ...s, [categorie.id]: null }));

    this.service.modifierMotsCles(categorie.id, this.motsClesPour(categorie.id)).subscribe({
      next: (reponse) => {
        this.enregistrementMotsClesEnCoursId.set(null);
        this.categories.update((liste) => liste.map((c) => (c.id === reponse.id ? reponse : c)));
        this.brouillonMotsCles.update((s) => ({ ...s, [reponse.id]: [...reponse.mots_cles] }));
        this.afficherMessage(`Mots-clés de « ${categorie.nom} » enregistrés.`, false);
      },
      error: (erreur: unknown) => {
        this.enregistrementMotsClesEnCoursId.set(null);
        this.erreurMotsClesParCategorie.update((s) => ({ ...s, [categorie.id]: extraireMessageErreur(erreur) }));
      },
    });
  }

  // ---- Tester la recherche ----

  changerTexteTest(valeur: string): void {
    this.texteTest.set(valeur);
  }

  tester(): void {
    const q = this.texteTest().trim();
    if (!q || this.chargementTest()) {
      return;
    }
    this.chargementTest.set(true);
    this.erreurTest.set(null);

    this.service.tester(q).subscribe({
      next: (resultat) => {
        this.chargementTest.set(false);
        this.resultatTest.set(resultat);
      },
      error: (erreur: unknown) => {
        this.chargementTest.set(false);
        this.erreurTest.set(extraireMessageErreur(erreur));
      },
    });
  }

  private afficherMessage(texte: string, erreur: boolean): void {
    this.message.set({ texte, erreur });
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.message.set(null), DUREE_MESSAGE_MS);
  }
}

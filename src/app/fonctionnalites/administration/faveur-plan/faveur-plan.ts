import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { FaveurPlanService } from './faveur-plan.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { PartenaireRecherche } from '../../../modeles/credit-pub.model';
import {
  CodePlan,
  OPTIONS_PLAN,
  ProfilPartenaireFaveur,
} from '../../../modeles/profil-partenaire-faveur.model';

const LONGUEUR_MIN_RECHERCHE = 2;

/**
 * Écran "Faveur de plan" : recherche d'un partenaire puis octroi/retrait
 * gratuit d'un plan d'abonnement (POST/DELETE .../faveur/). Il n'existe pas
 * d'endpoint pour lire l'état d'abonnement courant d'un partenaire avant
 * action — l'écran ne peut donc afficher plan/faveur qu'après la première
 * réponse d'octroi ou de retrait (voir profilFaveur ci-dessous).
 */
@Component({
  selector: 'app-faveur-plan',
  imports: [],
  templateUrl: './faveur-plan.html',
  styleUrl: './faveur-plan.scss',
})
export class FaveurPlan implements OnInit {
  private readonly service = inject(FaveurPlanService);
  private readonly destroyRef = inject(DestroyRef);

  readonly optionsPlan = OPTIONS_PLAN;

  // ---- Recherche ----
  private readonly rechercheSubject = new Subject<string>();

  readonly rechercheTexte = signal('');
  readonly rechercheEnCours = signal(false);
  readonly rechercheLancee = signal(false);
  readonly erreurRecherche = signal<string | null>(null);
  readonly resultats = signal<PartenaireRecherche[]>([]);

  // ---- Partenaire sélectionné ----
  readonly partenaireSelectionne = signal<PartenaireRecherche | null>(null);
  // État d'abonnement connu seulement après une réponse d'octroi/retrait (pas de GET dédié).
  readonly profilFaveur = signal<ProfilPartenaireFaveur | null>(null);

  // ---- Octroi d'un plan ----
  readonly planSelectionne = signal<CodePlan | ''>('');
  readonly motifOctroi = signal('');
  readonly octroiAConfirmer = signal(false);
  readonly octroiEnCours = signal(false);
  readonly erreurOctroi = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  // ---- Retrait de la faveur ----
  readonly motifRetrait = signal('');
  readonly retraitAConfirmer = signal(false);
  readonly retraitEnCours = signal(false);
  readonly erreurRetrait = signal<string | null>(null);

  ngOnInit(): void {
    this.rechercheSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.rechercheEnCours.set(true);
          this.erreurRecherche.set(null);
        }),
        switchMap((q) => {
          const texte = q.trim();
          if (texte.length < LONGUEUR_MIN_RECHERCHE) {
            return of<PartenaireRecherche[]>([]);
          }
          return this.service.rechercherPartenaires(texte).pipe(
            catchError((erreur: unknown) => {
              this.erreurRecherche.set(extraireMessageErreur(erreur));
              return of<PartenaireRecherche[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultats) => {
        this.rechercheEnCours.set(false);
        this.rechercheLancee.set(true);
        this.resultats.set(resultats);
      });
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.rechercheSubject.next(valeur);
  }

  selectionnerPartenaire(partenaire: PartenaireRecherche): void {
    this.partenaireSelectionne.set(partenaire);
    this.profilFaveur.set(null);
    this.planSelectionne.set('');
    this.motifOctroi.set('');
    this.motifRetrait.set('');
    this.erreurOctroi.set(null);
    this.erreurRetrait.set(null);
    this.messageSucces.set(null);
  }

  changerPartenaire(): void {
    this.partenaireSelectionne.set(null);
    this.profilFaveur.set(null);
  }

  changerPlanSelectionne(valeur: string): void {
    this.planSelectionne.set(valeur as CodePlan | '');
  }

  changerMotifOctroi(valeur: string): void {
    this.motifOctroi.set(valeur);
  }

  changerMotifRetrait(valeur: string): void {
    this.motifRetrait.set(valeur);
  }

  libellePlan(code: CodePlan): string {
    return this.optionsPlan.find((o) => o.code === code)?.libelle ?? code;
  }

  demanderOctroi(): void {
    if (!this.planSelectionne() || this.octroiEnCours()) {
      return;
    }
    this.erreurOctroi.set(null);
    this.octroiAConfirmer.set(true);
  }

  annulerOctroi(): void {
    this.octroiAConfirmer.set(false);
  }

  confirmerOctroi(): void {
    const partenaire = this.partenaireSelectionne();
    const plan = this.planSelectionne();
    if (!partenaire || !plan) {
      return;
    }
    this.octroiAConfirmer.set(false);
    this.octroiEnCours.set(true);
    this.erreurOctroi.set(null);
    this.messageSucces.set(null);

    this.service.accorderPlan(partenaire.id, plan, this.motifOctroi().trim() || undefined).subscribe({
      next: (profil) => {
        this.octroiEnCours.set(false);
        this.profilFaveur.set(profil);
        this.planSelectionne.set('');
        this.motifOctroi.set('');
        this.messageSucces.set(`Plan « ${profil.plan_libelle} » offert avec succès.`);
      },
      error: (erreur: unknown) => {
        this.octroiEnCours.set(false);
        this.erreurOctroi.set(extraireMessageErreur(erreur));
      },
    });
  }

  demanderRetrait(): void {
    if (this.retraitEnCours()) {
      return;
    }
    this.erreurRetrait.set(null);
    this.retraitAConfirmer.set(true);
  }

  annulerRetrait(): void {
    this.retraitAConfirmer.set(false);
  }

  confirmerRetrait(): void {
    const partenaire = this.partenaireSelectionne();
    if (!partenaire) {
      return;
    }
    this.retraitAConfirmer.set(false);
    this.retraitEnCours.set(true);
    this.erreurRetrait.set(null);
    this.messageSucces.set(null);

    this.service.retirerFaveur(partenaire.id, this.motifRetrait().trim() || undefined).subscribe({
      next: (profil) => {
        this.retraitEnCours.set(false);
        this.profilFaveur.set(profil);
        this.motifRetrait.set('');
        this.messageSucces.set('Faveur retirée avec succès.');
      },
      error: (erreur: unknown) => {
        this.retraitEnCours.set(false);
        this.erreurRetrait.set(extraireMessageErreur(erreur));
      },
    });
  }

  formaterDate(iso: string | null): string {
    if (!iso) {
      return 'Illimité';
    }
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

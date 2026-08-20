import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { CreditsPubService } from './credits-pub.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import {
  CreditPub,
  FormulePub,
  PartenaireCredits,
  PartenaireRecherche,
} from '../../../modeles/credit-pub.model';

const LONGUEUR_MIN_RECHERCHE = 2;

/**
 * Écran "Crédits de pub" : recherche d'un partenaire puis octroi/retrait de
 * crédits de formule publicitaire (GET recherche/credits, POST credits,
 * DELETE credits, GET formules).
 */
@Component({
  selector: 'app-credits-pub',
  imports: [],
  templateUrl: './credits-pub.html',
  styleUrl: './credits-pub.scss',
})
export class CreditsPub implements OnInit {
  private readonly service = inject(CreditsPubService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formaterNombre = formaterNombre;

  // ---- Recherche ----
  private readonly rechercheSubject = new Subject<string>();

  readonly rechercheTexte = signal('');
  readonly rechercheEnCours = signal(false);
  readonly rechercheLancee = signal(false);
  readonly erreurRecherche = signal<string | null>(null);
  readonly resultats = signal<PartenaireRecherche[]>([]);

  // ---- Partenaire sélectionné + ses crédits ----
  readonly partenaireSelectionne = signal<PartenaireCredits | null>(null);
  readonly chargementCredits = signal(false);
  readonly erreurCredits = signal<string | null>(null);
  readonly credits = signal<CreditPub[]>([]);

  // ---- Formules disponibles pour l'octroi ----
  readonly formules = signal<FormulePub[]>([]);
  readonly chargementFormules = signal(false);
  readonly erreurFormules = signal<string | null>(null);

  // ---- Octroi d'un crédit ----
  readonly formuleSelectionneeId = signal<number | null>(null);
  readonly motifOctroi = signal('');
  readonly octroiEnCours = signal(false);
  readonly erreurOctroi = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  // ---- Retrait d'un crédit ----
  readonly creditARetirer = signal<CreditPub | null>(null);
  readonly retraitEnCoursId = signal<string | null>(null);
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
    this.partenaireSelectionne.set({
      id: partenaire.id,
      nom_commerce: partenaire.nom_commerce,
      telephone: partenaire.telephone,
    });
    this.messageSucces.set(null);
    this.chargerCredits();
    if (this.formules().length === 0) {
      this.chargerFormules();
    }
  }

  changerPartenaire(): void {
    this.partenaireSelectionne.set(null);
    this.credits.set([]);
    this.erreurCredits.set(null);
    this.formuleSelectionneeId.set(null);
    this.motifOctroi.set('');
    this.erreurOctroi.set(null);
    this.messageSucces.set(null);
  }

  chargerCredits(): void {
    const partenaire = this.partenaireSelectionne();
    if (!partenaire) {
      return;
    }
    this.chargementCredits.set(true);
    this.erreurCredits.set(null);

    this.service.listerCredits(partenaire.id).subscribe({
      next: (reponse) => {
        this.chargementCredits.set(false);
        this.credits.set(reponse.credits);
        this.partenaireSelectionne.set(reponse.partenaire);
      },
      error: (erreur: unknown) => {
        this.chargementCredits.set(false);
        this.erreurCredits.set(extraireMessageErreur(erreur));
      },
    });
  }

  chargerFormules(): void {
    this.chargementFormules.set(true);
    this.erreurFormules.set(null);

    this.service.listerFormules().subscribe({
      next: (formules) => {
        this.chargementFormules.set(false);
        this.formules.set(formules.filter((f) => f.est_active));
      },
      error: (erreur: unknown) => {
        this.chargementFormules.set(false);
        this.erreurFormules.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerFormuleSelectionnee(valeur: string): void {
    this.formuleSelectionneeId.set(valeur ? Number(valeur) : null);
  }

  changerMotif(valeur: string): void {
    this.motifOctroi.set(valeur);
  }

  offrirCredit(): void {
    const partenaire = this.partenaireSelectionne();
    const formuleId = this.formuleSelectionneeId();
    if (!partenaire || !formuleId || this.octroiEnCours()) {
      return;
    }
    this.octroiEnCours.set(true);
    this.erreurOctroi.set(null);
    this.messageSucces.set(null);

    this.service.accorderCredit(partenaire.id, formuleId, this.motifOctroi().trim() || undefined).subscribe({
      next: () => {
        this.octroiEnCours.set(false);
        this.formuleSelectionneeId.set(null);
        this.motifOctroi.set('');
        this.messageSucces.set('Crédit offert avec succès.');
        this.chargerCredits();
      },
      error: (erreur: unknown) => {
        this.octroiEnCours.set(false);
        this.erreurOctroi.set(extraireMessageErreur(erreur));
      },
    });
  }

  demanderRetrait(credit: CreditPub): void {
    this.erreurRetrait.set(null);
    this.creditARetirer.set(credit);
  }

  annulerRetrait(): void {
    this.creditARetirer.set(null);
  }

  confirmerRetrait(): void {
    const credit = this.creditARetirer();
    if (!credit) {
      return;
    }
    this.creditARetirer.set(null);
    this.retraitEnCoursId.set(credit.id);
    this.erreurRetrait.set(null);
    this.messageSucces.set(null);

    this.service.retirerCredit(credit.id).subscribe({
      next: () => {
        this.retraitEnCoursId.set(null);
        this.credits.update((liste) => liste.filter((c) => c.id !== credit.id));
        this.messageSucces.set('Crédit retiré avec succès.');
      },
      error: (erreur: unknown) => {
        this.retraitEnCoursId.set(null);
        this.erreurRetrait.set(extraireMessageErreur(erreur));
      },
    });
  }

  formaterFcfa(valeur: number): string {
    return `${formaterNombre(valeur)} FCFA`;
  }

  formaterDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

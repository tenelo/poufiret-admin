import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { ModerationService } from './moderation.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import {
  ACTIONS_PAR_ETAT,
  ActionModeration,
  CONSEQUENCES_ACTION,
  CompteModeration,
  GraviteAction,
  OPTIONS_ROLE_FILTRE,
  OptionActionModeration,
  RoleCompte,
} from '../../../modeles/compte-moderation.model';

const LONGUEUR_MIN_RECHERCHE = 2;

interface ActionEnAttente {
  compte: CompteModeration;
  option: OptionActionModeration;
}

/**
 * Écran "Modération de comptes" (réservé super-admin) : recherche de comptes
 * puis application d'une transition de modération (suspendre/bannir/
 * supprimer/restaurer), avec garde-fous proportionnés à la gravité de
 * l'action. Aucune action ne part jamais automatiquement : uniquement sur
 * clic explicite après confirmation.
 */
@Component({
  selector: 'app-moderation',
  imports: [],
  templateUrl: './moderation.html',
  styleUrl: './moderation.scss',
})
export class Moderation implements OnInit {
  private readonly service = inject(ModerationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly optionsRole = OPTIONS_ROLE_FILTRE;

  // ---- Recherche ----
  private readonly rechercheSubject = new Subject<string>();

  readonly rechercheTexte = signal('');
  readonly filtreRole = signal<RoleCompte | ''>('');
  readonly rechercheEnCours = signal(false);
  readonly rechercheLancee = signal(false);
  readonly erreurRecherche = signal<string | null>(null);
  readonly comptes = signal<CompteModeration[]>([]);

  readonly messageSucces = signal<string | null>(null);
  readonly actionEnCoursId = signal<number | null>(null);

  // ---- Action en attente de confirmation (dialog) ----
  readonly actionEnAttente = signal<ActionEnAttente | null>(null);
  readonly motifAction = signal('');
  readonly motifToucheAction = signal(false);
  readonly saisieConfirmationHard = signal('');
  readonly erreurAction = signal<string | null>(null);

  readonly graviteEnAttente = computed<GraviteAction | null>(() => this.actionEnAttente()?.option.gravite ?? null);

  readonly consequenceEnAttente = computed<string | null>(() => {
    const attente = this.actionEnAttente();
    if (!attente) {
      return null;
    }
    return CONSEQUENCES_ACTION[attente.option.action] ?? null;
  });

  readonly hardConfirmationValide = computed(() => {
    const attente = this.actionEnAttente();
    if (!attente) {
      return false;
    }
    const saisie = this.saisieConfirmationHard().trim();
    if (!saisie) {
      return false;
    }
    return saisie === attente.compte.username || saisie === attente.compte.telephone;
  });

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
            return of<CompteModeration[]>([]);
          }
          return this.service.rechercherComptes(texte, this.filtreRole()).pipe(
            catchError((erreur: unknown) => {
              this.erreurRecherche.set(extraireMessageErreur(erreur));
              return of<CompteModeration[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((comptes) => {
        this.rechercheEnCours.set(false);
        this.rechercheLancee.set(true);
        this.comptes.set(comptes);
      });
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.rechercheSubject.next(valeur);
  }

  changerFiltreRole(valeur: string): void {
    this.filtreRole.set(valeur as RoleCompte | '');
    if (this.rechercheTexte().trim().length >= LONGUEUR_MIN_RECHERCHE) {
      this.rechercheSubject.next(this.rechercheTexte());
    }
  }

  actionsDisponibles(compte: CompteModeration): OptionActionModeration[] {
    return ACTIONS_PAR_ETAT[compte.etat] ?? [];
  }

  // ---- Ouverture / annulation du dialog de confirmation ----

  demanderAction(compte: CompteModeration, option: OptionActionModeration): void {
    this.erreurAction.set(null);
    this.motifAction.set('');
    this.motifToucheAction.set(false);
    this.saisieConfirmationHard.set('');
    this.actionEnAttente.set({ compte, option });
  }

  annulerAction(): void {
    this.actionEnAttente.set(null);
  }

  changerMotif(valeur: string): void {
    this.motifAction.set(valeur);
  }

  changerSaisieConfirmationHard(valeur: string): void {
    this.saisieConfirmationHard.set(valeur);
  }

  // ---- Confirmation explicite : seul point d'entrée qui déclenche l'appel réseau ----

  confirmerAction(): void {
    const attente = this.actionEnAttente();
    if (!attente) {
      return;
    }
    const { compte, option } = attente;

    if (option.gravite !== 'simple' && !this.motifAction().trim()) {
      this.motifToucheAction.set(true);
      return;
    }
    if (option.gravite === 'hard' && !this.hardConfirmationValide()) {
      return;
    }

    this.actionEnAttente.set(null);
    this.appliquerModeration(compte, option, this.motifAction().trim() || undefined);
  }

  private appliquerModeration(compte: CompteModeration, option: OptionActionModeration, motif?: string): void {
    this.actionEnCoursId.set(compte.id);
    this.erreurAction.set(null);
    this.messageSucces.set(null);

    this.service.moderer(compte.id, option.action, motif).subscribe({
      next: () => {
        this.actionEnCoursId.set(null);
        this.messageSucces.set(`« ${option.libelle} » appliqué à ${compte.nom_complet || compte.username}.`);
        // Recharge depuis le backend plutôt que de deviner localement le
        // nouvel état/libellé (la réponse de modération ne renvoie que
        // {detail, action}, pas le compte à jour).
        this.rechercheSubject.next(this.rechercheTexte());
      },
      error: (erreur: unknown) => {
        this.actionEnCoursId.set(null);
        this.erreurAction.set(extraireMessageErreur(erreur));
      },
    });
  }

  formaterDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  classeChipEtat(compte: CompteModeration): string {
    switch (compte.etat) {
      case 'actif':
        return 'chip-actif';
      case 'suspendu':
        return 'chip-suspendu';
      case 'banni':
        return 'chip-banni';
      case 'supprime':
        return 'chip-supprime';
      default:
        return 'chip-inactif';
    }
  }
}

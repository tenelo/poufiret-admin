import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';

import { RecherchePartenairesService } from '../../fonctionnalites/administration/recherche-partenaires.service';
import { PartenaireRecherche } from '../../modeles/credit-pub.model';

const DELAI_MS = 350;

export interface PartenaireChoisi {
  id: number;
  nom: string;
}

/**
 * Sélecteur de partenaire avec suggestions (GET /administration/partenaires/recherche/, 2
 * caractères minimum) : une fois choisi, le partenaire s'affiche en puce retirable. Composant
 * contrôlé : il affiche `partenaire` et émet le nouveau choix (ou null au retrait).
 */
@Component({
  selector: 'app-selecteur-partenaire',
  imports: [],
  templateUrl: './selecteur-partenaire.html',
  styleUrl: './selecteur-partenaire.scss',
})
export class SelecteurPartenaire implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly recherche = inject(RecherchePartenairesService);

  readonly partenaire = input<PartenaireChoisi | null>(null);
  /** Identifiant du champ de saisie, pour le lier à un <label for>. */
  readonly idChamp = input('selecteur-partenaire');

  readonly partenaireChange = output<PartenaireChoisi | null>();

  readonly texte = signal('');
  readonly suggestions = signal<PartenaireRecherche[]>([]);

  private readonly saisie$ = new Subject<string>();

  ngOnInit(): void {
    this.saisie$
      .pipe(
        debounceTime(DELAI_MS),
        switchMap((texte) =>
          texte.trim().length < 2
            ? of([] as PartenaireRecherche[])
            : this.recherche.rechercherPartenaires(texte.trim()).pipe(catchError(() => of([]))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultats) => this.suggestions.set(resultats));
  }

  saisir(valeur: string): void {
    this.texte.set(valeur);
    this.saisie$.next(valeur);
  }

  choisir(partenaire: PartenaireRecherche): void {
    this.suggestions.set([]);
    this.texte.set('');
    this.partenaireChange.emit({ id: partenaire.id, nom: partenaire.nom_commerce });
  }

  retirer(): void {
    this.partenaireChange.emit(null);
  }
}

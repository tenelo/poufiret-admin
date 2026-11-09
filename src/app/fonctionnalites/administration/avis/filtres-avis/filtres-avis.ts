import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { FiltresAvisAdmin, OPTIONS_NOTE_AVIS, OPTIONS_VISIBILITE_AVIS } from '../../../../modeles/avis-admin.model';

const DELAI_MS = 350;

/**
 * Filtres de la modération des avis : recherche, note (1-5), visible/masqué, type d'objet (options
 * dérivées des avis déjà chargés, aucun contrat ne fixe les valeurs possibles — voir
 * AvisAdminComponent.optionsObjetType), partenaire (recherche texte, pas d'annuaire fourni, même
 * principe que le champ « artisan » des interventions) et période (du/au). Composant contrôlé, même
 * gabarit que FiltresInterventions.
 */
@Component({
  selector: 'app-filtres-avis',
  imports: [],
  templateUrl: './filtres-avis.html',
  styleUrl: './filtres-avis.scss',
})
export class FiltresAvis implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly filtres = input.required<FiltresAvisAdmin>();
  readonly optionsObjetType = input<string[]>([]);

  readonly filtresChange = output<FiltresAvisAdmin>();

  readonly optionsNote = OPTIONS_NOTE_AVIS;
  readonly optionsVisibilite = OPTIONS_VISIBILITE_AVIS;

  private readonly saisieRecherche$ = new Subject<void>();
  private readonly saisiePartenaire$ = new Subject<void>();
  private texteRecherche = '';
  private textePartenaire = '';

  // Valeurs locales des champs texte (évite de réémettre à chaque frappe, voir debounce ci-dessous).
  readonly rechercheAffichee = signal('');
  readonly partenaireAffiche = signal('');

  ngOnInit(): void {
    this.rechercheAffichee.set(this.filtres().recherche);
    this.partenaireAffiche.set(this.filtres().partenaire);

    this.saisieRecherche$
      .pipe(debounceTime(DELAI_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.maj({ recherche: this.texteRecherche }));

    this.saisiePartenaire$
      .pipe(debounceTime(DELAI_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.maj({ partenaire: this.textePartenaire }));
  }

  saisirRecherche(valeur: string): void {
    this.rechercheAffichee.set(valeur);
    this.texteRecherche = valeur;
    this.saisieRecherche$.next();
  }

  saisirPartenaire(valeur: string): void {
    this.partenaireAffiche.set(valeur);
    this.textePartenaire = valeur;
    this.saisiePartenaire$.next();
  }

  changerNote(valeur: string): void {
    this.maj({ note: valeur });
  }

  changerVisible(valeur: string): void {
    this.maj({ visible: valeur });
  }

  changerObjetType(valeur: string): void {
    this.maj({ objetType: valeur });
  }

  changerDu(valeur: string): void {
    this.maj({ du: valeur });
  }

  changerAu(valeur: string): void {
    this.maj({ au: valeur });
  }

  private maj(partiel: Partial<FiltresAvisAdmin>): void {
    this.filtresChange.emit({ ...this.filtres(), ...partiel });
  }
}

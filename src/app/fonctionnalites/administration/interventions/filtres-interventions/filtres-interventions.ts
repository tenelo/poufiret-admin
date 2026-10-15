import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { FiltresInterventionsAdmin, MetaInterventions } from '../../../../modeles/intervention-admin.model';

const DELAI_MS = 350;

/**
 * Filtres du centre des demandes d'intervention : recherche, urgence, type (options issues de
 * meta), artisan (recherche texte — aucun annuaire d'artisans fourni par le contrat, envoyé tel
 * quel au backend) et période (du/au). Composant contrôlé, même principe que FiltresCommandes.
 */
@Component({
  selector: 'app-filtres-interventions',
  imports: [],
  templateUrl: './filtres-interventions.html',
  styleUrl: './filtres-interventions.scss',
})
export class FiltresInterventions implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly filtres = input.required<FiltresInterventionsAdmin>();
  readonly meta = input<MetaInterventions | null>(null);

  readonly filtresChange = output<FiltresInterventionsAdmin>();

  private readonly saisieRecherche$ = new Subject<void>();
  private readonly saisieArtisan$ = new Subject<void>();
  private texteRecherche = '';
  private texteArtisan = '';

  // Valeurs locales des champs texte (évite de réémettre à chaque frappe, voir debounce ci-dessous).
  readonly rechercheAffichee = signal('');
  readonly artisanAffiche = signal('');

  ngOnInit(): void {
    this.rechercheAffichee.set(this.filtres().recherche);
    this.artisanAffiche.set(this.filtres().artisan);

    this.saisieRecherche$
      .pipe(debounceTime(DELAI_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.maj({ recherche: this.texteRecherche }));

    this.saisieArtisan$
      .pipe(debounceTime(DELAI_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.maj({ artisan: this.texteArtisan }));
  }

  saisirRecherche(valeur: string): void {
    this.rechercheAffichee.set(valeur);
    this.texteRecherche = valeur;
    this.saisieRecherche$.next();
  }

  saisirArtisan(valeur: string): void {
    this.artisanAffiche.set(valeur);
    this.texteArtisan = valeur;
    this.saisieArtisan$.next();
  }

  changerUrgence(valeur: string): void {
    this.maj({ urgence: valeur });
  }

  changerType(valeur: string): void {
    this.maj({ type: valeur });
  }

  changerDu(valeur: string): void {
    this.maj({ du: valeur });
  }

  changerAu(valeur: string): void {
    this.maj({ au: valeur });
  }

  private maj(partiel: Partial<FiltresInterventionsAdmin>): void {
    this.filtresChange.emit({ ...this.filtres(), ...partiel });
  }
}

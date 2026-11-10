import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { StatistiquesUsageService } from '../statistiques-usage.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterNombre, formaterTaux } from '../../tableau-de-bord-admin/palette-graphiques';
import {
  ContactsPartenairesUsage,
  FiltresStatistiquesUsage,
  TriContactsPartenairesUsage,
} from '../../../../modeles/statistiques-usage.model';

const TAILLE_PAGE = 20;

/** Tableau des partenaires (GET contacts-partenaires/), trié et paginé. */
@Component({
  selector: 'app-partenaires-usage',
  imports: [],
  templateUrl: './partenaires-usage.html',
  styleUrl: './partenaires-usage.scss',
})
export class PartenairesUsageSection {
  private readonly service = inject(StatistiquesUsageService);

  readonly filtres = input.required<FiltresStatistiquesUsage>();

  readonly donnees = signal<ContactsPartenairesUsage | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly colonneTri = signal<TriContactsPartenairesUsage>('contacts');
  readonly directionTri = signal<'asc' | 'desc'>('desc');
  readonly page = signal(1);

  readonly nbPages = computed(() => Math.max(1, Math.ceil((this.donnees()?.count ?? 0) / TAILLE_PAGE)));

  readonly formaterNombre = formaterNombre;
  readonly formaterTaux = formaterTaux;

  // Dernier filtre vu : détecte un changement de période/département pour revenir à la page 1
  // (un seul effet, pour ne jamais déclencher deux chargements pour un même changement).
  private filtresPrecedents: FiltresStatistiquesUsage | null = null;

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      const colonne = this.colonneTri();
      const direction = this.directionTri();
      const page = this.page();
      untracked(() => {
        const memeFiltres =
          this.filtresPrecedents?.du === filtres.du &&
          this.filtresPrecedents?.au === filtres.au &&
          this.filtresPrecedents?.departement === filtres.departement;
        this.filtresPrecedents = filtres;
        const pageEffective = memeFiltres ? page : 1;
        if (pageEffective !== page) {
          this.page.set(1);
        }
        this.charger(filtres, colonne, direction, pageEffective);
      });
    });
  }

  changerTri(colonne: TriContactsPartenairesUsage): void {
    if (this.colonneTri() === colonne) {
      this.directionTri.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.colonneTri.set(colonne);
      this.directionTri.set('desc');
    }
    this.page.set(1);
  }

  pagePrecedente(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  pageSuivante(): void {
    this.page.update((p) => Math.min(this.nbPages(), p + 1));
  }

  private charger(
    filtres: FiltresStatistiquesUsage,
    colonne: TriContactsPartenairesUsage,
    direction: 'asc' | 'desc',
    page: number,
  ): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    const tri = direction === 'desc' ? (`-${colonne}` as const) : colonne;
    this.service.contactsPartenaires(filtres, tri, page, TAILLE_PAGE).subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

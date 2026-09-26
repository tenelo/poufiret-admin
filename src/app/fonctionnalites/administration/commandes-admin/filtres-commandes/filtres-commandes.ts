import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, of } from 'rxjs';

import { PartenaireChoisi, SelecteurPartenaire } from '../../../../partage/selecteur-partenaire/selecteur-partenaire';
import { PartenairesListeService } from '../../partenaires-liste/partenaires-liste.service';
import { Departement } from '../../../../modeles/departement.model';
import { FiltresCommandesAdmin, MetaCommandes, PeriodeCommandes } from '../../../../modeles/commande-admin.model';

const DELAI_MS = 350;

/**
 * Filtres communs du centre des commandes : période, recherche, partenaire (recherche avec
 * suggestions), département, mode de livraison et statut (options issues de meta, limitées au
 * groupe courant). Composant contrôlé : il affiche `filtres` et émet le jeu complet à chaque
 * changement, le parent interroge l'API. En mode « stats » (tableau de bord), seuls la période, le
 * partenaire et le département sont proposés.
 */
@Component({
  selector: 'app-filtres-commandes',
  imports: [SelecteurPartenaire],
  templateUrl: './filtres-commandes.html',
  styleUrl: './filtres-commandes.scss',
})
export class FiltresCommandes implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly partenairesService = inject(PartenairesListeService);

  readonly filtres = input.required<FiltresCommandesAdmin>();
  readonly meta = input<MetaCommandes | null>(null);
  /** Groupe de l'onglet courant (limite les statuts proposés) ; null = tous. */
  readonly groupe = input<string | null>(null);
  /** Mode tableau de bord : seulement période, partenaire et département. */
  readonly modeStats = input(false);

  readonly filtresChange = output<FiltresCommandesAdmin>();

  readonly departements = signal<Departement[]>([]);

  readonly optionsStatut = computed(() => {
    const groupe = this.groupe();
    return (this.meta()?.statuts ?? []).filter((s) => !groupe || s.groupe === groupe);
  });

  private readonly saisieRecherche$ = new Subject<void>();
  private texteRecherche = '';

  ngOnInit(): void {
    this.partenairesService
      .listerDepartements()
      .pipe(catchError(() => of([] as Departement[])))
      .subscribe((liste) => this.departements.set(liste));

    this.saisieRecherche$
      .pipe(debounceTime(DELAI_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.maj({ recherche: this.texteRecherche }));
  }

  libellePeriodeVide(): string {
    return this.modeStats() ? '30 derniers jours' : 'Toute période';
  }

  changerPeriode(valeur: string): void {
    this.maj({ periode: valeur as PeriodeCommandes });
  }

  saisirRecherche(valeur: string): void {
    this.texteRecherche = valeur;
    this.saisieRecherche$.next();
  }

  changerPartenaire(partenaire: PartenaireChoisi | null): void {
    this.maj({ partenaire });
  }

  changerDepartement(valeur: string): void {
    this.maj({ departement: valeur === '' ? '' : Number(valeur) });
  }

  private maj(partiel: Partial<FiltresCommandesAdmin>): void {
    this.filtresChange.emit({ ...this.filtres(), ...partiel });
  }

  changerMode(valeur: string): void {
    this.maj({ mode: valeur });
  }

  changerStatut(valeur: string): void {
    this.maj({ statut: valeur });
  }

  changerDu(valeur: string): void {
    this.maj({ du: valeur });
  }

  changerAu(valeur: string): void {
    this.maj({ au: valeur });
  }
}

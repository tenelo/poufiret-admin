import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, of } from 'rxjs';

import { LocationService } from '../../../locations/location.service';
import { LoueurAdminListe } from '../../../../modeles/logement.model';
import { FiltresDemandesAdmin, NatureDemandeMeta } from '../../../../modeles/reservation.model';

const DELAI_MS = 350;

/**
 * Filtres du centre des demandes de location : nature, loueur (liste complète via
 * LocationService.listerLoueursAdmin, pas de recherche serveur dédiée), période (du/au) et
 * recherche libre. Composant contrôlé, même principe que FiltresCommandes. Le filtre loueur est
 * masqué quand le loueur est imposé par le parent (onglet Demandes de l'espace loueur, admin).
 */
@Component({
  selector: 'app-filtres-demandes-location',
  imports: [],
  templateUrl: './filtres-demandes-location.html',
  styleUrl: './filtres-demandes-location.scss',
})
export class FiltresDemandesLocation implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(LocationService);

  readonly filtres = input.required<FiltresDemandesAdmin>();
  readonly natures = input<NatureDemandeMeta[]>([]);
  readonly partenaireVerrouille = input(false);

  readonly filtresChange = output<FiltresDemandesAdmin>();

  readonly loueurs = signal<LoueurAdminListe[]>([]);

  private readonly saisieRecherche$ = new Subject<void>();
  private texteRecherche = '';

  ngOnInit(): void {
    this.service
      .listerLoueursAdmin()
      .pipe(catchError(() => of([] as LoueurAdminListe[])))
      .subscribe((liste) => this.loueurs.set(liste));

    this.saisieRecherche$
      .pipe(debounceTime(DELAI_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.maj({ recherche: this.texteRecherche }));
  }

  changerNature(valeur: string): void {
    this.maj({ nature: valeur });
  }

  changerLoueur(valeur: string): void {
    if (!valeur) {
      this.maj({ partenaire: null });
      return;
    }
    const loueur = this.loueurs().find((l) => l.id === Number(valeur));
    this.maj({ partenaire: loueur ? { id: loueur.id, nom: loueur.nom } : null });
  }

  saisirRecherche(valeur: string): void {
    this.texteRecherche = valeur;
    this.saisieRecherche$.next();
  }

  changerDu(valeur: string): void {
    this.maj({ du: valeur });
  }

  changerAu(valeur: string): void {
    this.maj({ au: valeur });
  }

  private maj(partiel: Partial<FiltresDemandesAdmin>): void {
    this.filtresChange.emit({ ...this.filtres(), ...partiel });
  }
}

import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import {
  CompteursStatutPubliciteAdmin,
  FILTRES_PUBLICITES_ADMIN_DEFAUT,
  FiltresPublicitesAdmin,
  ONGLETS_STATUT_PUBLICITE_ADMIN,
  OngletStatutPubliciteAdmin,
  QuotaFormule,
} from '../../../../modeles/publicites-admin.model';
import { OPTIONS_PORTEE, PorteePublicite } from '../../../../modeles/publicite.model';

const DELAI_RECHERCHE_MS = 350;

/**
 * Onglets par statut (avec compteurs) + filtres (recherche, formule, portée) de la gestion
 * admin des pubs. Ne fait aucun appel réseau : émet les filtres, le parent interroge l'API.
 */
@Component({
  selector: 'app-filtres-publicites-admin',
  imports: [],
  templateUrl: './filtres-publicites-admin.html',
  styleUrl: './filtres-publicites-admin.scss',
})
export class BarreFiltresPublicitesAdmin {
  private readonly destroyRef = inject(DestroyRef);

  readonly compteurs = input<CompteursStatutPubliciteAdmin | null>(null);
  readonly formules = input<QuotaFormule[]>([]);

  /**
   * Onglet de statut imposé par le parent (ex. arrivée depuis une notification). Un objet, et non
   * la valeur seule : chaque nouvel ordre est pris en compte même si le statut est identique.
   */
  readonly statutImpose = input<{ statut: OngletStatutPubliciteAdmin } | null>(null);

  readonly filtresChange = output<FiltresPublicitesAdmin>();

  readonly onglets = ONGLETS_STATUT_PUBLICITE_ADMIN;
  readonly optionsPortee = OPTIONS_PORTEE;

  readonly statut = signal<OngletStatutPubliciteAdmin>(FILTRES_PUBLICITES_ADMIN_DEFAUT.statut);
  readonly recherche = signal(FILTRES_PUBLICITES_ADMIN_DEFAUT.recherche);
  readonly formule = signal(FILTRES_PUBLICITES_ADMIN_DEFAUT.formule);
  readonly portee = signal<PorteePublicite | ''>(FILTRES_PUBLICITES_ADMIN_DEFAUT.portee);

  private readonly saisieRecherche$ = new Subject<void>();

  constructor() {
    effect(() => {
      const impose = this.statutImpose();
      if (impose) {
        this.statut.set(impose.statut);
      }
    });

    this.saisieRecherche$
      .pipe(debounceTime(DELAI_RECHERCHE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emettre());
  }

  compteur(onglet: OngletStatutPubliciteAdmin): number | null {
    const compteurs = this.compteurs();
    if (!compteurs) {
      return null;
    }
    const cle = onglet === 'toutes' ? 'total' : onglet;
    return compteurs[cle] ?? 0;
  }

  choisirOnglet(onglet: OngletStatutPubliciteAdmin): void {
    if (this.statut() === onglet) {
      return;
    }
    this.statut.set(onglet);
    this.emettre();
  }

  saisirRecherche(valeur: string): void {
    this.recherche.set(valeur);
    this.saisieRecherche$.next();
  }

  choisirFormule(valeur: string): void {
    this.formule.set(valeur);
    this.emettre();
  }

  choisirPortee(valeur: string): void {
    this.portee.set(valeur as PorteePublicite | '');
    this.emettre();
  }

  private emettre(): void {
    this.filtresChange.emit({
      statut: this.statut(),
      recherche: this.recherche(),
      formule: this.formule(),
      portee: this.portee(),
    });
  }
}

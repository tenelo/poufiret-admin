import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import {
  CompteursStatutPubliciteAdmin,
  FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT,
  FiltresRecherchePublicitesAdmin,
  OPTIONS_ORIGINE_PUBLICITE_ADMIN,
  ONGLETS_STATUT_PUBLICITE_ADMIN,
  OngletStatutPubliciteAdmin,
  OriginePubliciteAdmin,
  QuotaFormule,
} from '../../../../modeles/publicites-admin.model';
import { OPTIONS_PORTEE, PorteePublicite } from '../../../../modeles/publicite.model';

const DELAI_RECHERCHE_MS = 350;

/** Partenaire actuellement imposé par l'URL (clic depuis l'onglet Partenaires), pour la pastille. */
export interface PartenaireActifFiltre {
  id: number;
  nom: string;
}

const DEFAUT = FILTRES_LISTE_PUBLICITES_ADMIN_DEFAUT;

/**
 * Onglets par statut (avec compteurs) + filtres (recherche, formule, portée, partenaire, période,
 * origine) de la gestion admin des pubs. Ne fait aucun appel réseau : émet les filtres, le parent
 * interroge l'API. `filtresInitiaux` ne sert qu'à restaurer l'état depuis l'URL au premier rendu
 * (lu une seule fois, à la construction) : les saisies de l'utilisateur ensuite ne sont jamais
 * écrasées par un changement ultérieur de cet input.
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

  /** État restauré depuis l'URL au chargement (filtres autres que le statut) ; lu une seule fois. */
  readonly filtresInitiaux = input<FiltresRecherchePublicitesAdmin | null>(null);

  /** Partenaire imposé par l'URL (?partenaire=<id>), pour la pastille « Partenaire : … ✕ ». */
  readonly partenaireActif = input<PartenaireActifFiltre | null>(null);

  readonly filtresChange = output<FiltresRecherchePublicitesAdmin>();

  readonly onglets = ONGLETS_STATUT_PUBLICITE_ADMIN;
  readonly optionsPortee = OPTIONS_PORTEE;
  readonly optionsOrigine = OPTIONS_ORIGINE_PUBLICITE_ADMIN;

  readonly statut = signal<OngletStatutPubliciteAdmin>(DEFAUT.statut);
  readonly recherche = signal(DEFAUT.recherche);
  readonly formule = signal(DEFAUT.formule);
  readonly portee = signal<PorteePublicite | ''>(DEFAUT.portee);
  readonly dateDebut = signal(DEFAUT.dateDebut);
  readonly dateFin = signal(DEFAUT.dateFin);
  readonly origine = signal<OriginePubliciteAdmin[]>(DEFAUT.origine);
  private readonly partenaireId = signal<number | null>(DEFAUT.partenaireId);

  private filtresInitiauxAppliques = false;
  private readonly saisieRecherche$ = new Subject<void>();

  constructor() {
    // `filtresInitiaux` ne sert qu'à restaurer l'état depuis l'URL au premier rendu : appliqué une
    // seule fois (via ce drapeau), jamais réappliqué ensuite — les saisies de l'utilisateur ne sont
    // donc jamais écrasées par un changement ultérieur de cet input.
    effect(() => {
      const initiaux = this.filtresInitiaux();
      if (!initiaux || this.filtresInitiauxAppliques) {
        return;
      }
      this.filtresInitiauxAppliques = true;
      this.statut.set(initiaux.statut);
      this.recherche.set(initiaux.recherche);
      this.formule.set(initiaux.formule);
      this.portee.set(initiaux.portee);
      this.dateDebut.set(initiaux.dateDebut);
      this.dateFin.set(initiaux.dateFin);
      this.origine.set(initiaux.origine);
      this.partenaireId.set(initiaux.partenaireId);
    });

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

  changerDateDebut(valeur: string): void {
    this.dateDebut.set(valeur);
    this.emettre();
  }

  changerDateFin(valeur: string): void {
    this.dateFin.set(valeur);
    this.emettre();
  }

  basculerOrigine(valeur: OriginePubliciteAdmin, cochee: boolean): void {
    this.origine.update((liste) =>
      cochee ? [...liste, valeur] : liste.filter((v) => v !== valeur),
    );
    this.emettre();
  }

  origineCochee(valeur: OriginePubliciteAdmin): boolean {
    return this.origine().includes(valeur);
  }

  retirerPartenaire(): void {
    this.partenaireId.set(null);
    this.emettre();
  }

  /** Remet tous les filtres à leur valeur par défaut, à l'exception de l'onglet (statut) actif. */
  reinitialiser(): void {
    this.recherche.set(DEFAUT.recherche);
    this.formule.set(DEFAUT.formule);
    this.portee.set(DEFAUT.portee);
    this.dateDebut.set(DEFAUT.dateDebut);
    this.dateFin.set(DEFAUT.dateFin);
    this.origine.set(DEFAUT.origine);
    this.partenaireId.set(null);
    this.emettre();
  }

  private emettre(): void {
    this.filtresChange.emit({
      statut: this.statut(),
      recherche: this.recherche(),
      formule: this.formule(),
      portee: this.portee(),
      partenaireId: this.partenaireId(),
      dateDebut: this.dateDebut(),
      dateFin: this.dateFin(),
      origine: this.origine(),
    });
  }
}

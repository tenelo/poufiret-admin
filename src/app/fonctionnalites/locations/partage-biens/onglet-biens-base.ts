import { Directive, OnInit, inject, input, signal } from '@angular/core';

import { LocationService, PrefixeLocation, RessourceBien } from '../location.service';
import { formaterFrancs } from '../formater-location';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { OptionLocationMeta, ReponseLocationMeta } from '../../../modeles/location-meta.model';
import { BienLocation, OPTIONS_DISPONIBILITE_BIEN } from '../../../modeles/bien-location.model';

/**
 * Socle des onglets « Véhicules » et « Hébergements » : chargement filtré par disponibilité,
 * changement rapide de disponibilité, interrupteur Actif, ouverture du dialog. Les sous-classes ne
 * fixent que la ressource et leur rendu de carte (mêmes styles que OngletLogements).
 */
@Directive()
export abstract class OngletBiensBase<T extends BienLocation> implements OnInit {
  protected readonly service = inject(LocationService);

  protected abstract readonly ressource: RessourceBien;

  readonly prefixe = input.required<PrefixeLocation>();

  readonly optionsDisponibilite = OPTIONS_DISPONIBILITE_BIEN;
  readonly formaterFrancs = formaterFrancs;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly biens = signal<T[]>([]);
  readonly meta = signal<ReponseLocationMeta | null>(null);

  readonly filtreDisponibilite = signal('');

  readonly messageErreur = signal<string | null>(null);

  readonly dialogOuvert = signal(false);
  readonly bienEnEdition = signal<T | null>(null);

  readonly disponibiliteEnCoursId = signal<number | null>(null);
  readonly actifEnCoursId = signal<number | null>(null);

  ngOnInit(): void {
    this.charger();
    this.service.meta().subscribe({
      next: (meta) => this.meta.set(meta),
      error: () => undefined,
    });
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerBiens<T>(this.prefixe(), this.ressource, this.filtreDisponibilite() || undefined).subscribe({
      next: (biens) => {
        this.chargementEnCours.set(false);
        this.biens.set(biens);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerFiltreDisponibilite(valeur: string): void {
    this.filtreDisponibilite.set(valeur);
    this.charger();
  }

  /** Libellé fourni par le backend, sinon celui de la meta, sinon la valeur brute. */
  libelle(options: OptionLocationMeta[] | undefined, valeur: string, libelleBackend?: string): string {
    if (libelleBackend) return libelleBackend;
    return options?.find((o) => o.valeur === valeur)?.libelle ?? valeur;
  }

  changerDisponibiliteRapide(bien: T, disponibilite: string): void {
    if (disponibilite === bien.disponibilite || this.disponibiliteEnCoursId()) {
      return;
    }
    this.disponibiliteEnCoursId.set(bien.id);
    this.messageErreur.set(null);

    this.service.changerDisponibiliteBien<T>(this.prefixe(), this.ressource, bien.id, { disponibilite }).subscribe({
      next: (bienMaj) => {
        this.disponibiliteEnCoursId.set(null);
        this.remplacer(bienMaj);
      },
      error: (erreur: unknown) => {
        this.disponibiliteEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerActif(bien: T): void {
    if (this.actifEnCoursId()) {
      return;
    }
    this.actifEnCoursId.set(bien.id);
    this.messageErreur.set(null);

    this.service.modifierBien<T>(this.prefixe(), this.ressource, bien.id, { est_actif: !bien.est_actif }).subscribe({
      next: (bienMaj) => {
        this.actifEnCoursId.set(null);
        this.remplacer(bienMaj);
      },
      error: (erreur: unknown) => {
        this.actifEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  ouvrirCreation(): void {
    this.bienEnEdition.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(bien: T): void {
    this.bienEnEdition.set(bien);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
    this.charger();
  }

  imagePrincipale(bien: T): string | null {
    return bien.images.find((i) => i.est_principale)?.image ?? bien.images[0]?.image ?? null;
  }

  private remplacer(bienMaj: T): void {
    this.biens.update((liste) => liste.map((b) => (b.id === bienMaj.id ? bienMaj : b)));
  }
}

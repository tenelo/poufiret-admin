import { Component, OnInit, inject, input, signal } from '@angular/core';

import { LocationService, PrefixeLocation } from '../location.service';
import { DialogLogement } from './dialog-logement/dialog-logement';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ReponseLocationMeta } from '../../../modeles/location-meta.model';
import { Logement } from '../../../modeles/logement.model';

/**
 * Logements du loueur : cartes (photo, nom, type, localisation, loyer, caractéristiques, badge de
 * disponibilité, interrupteur Actif), changement rapide de disponibilité, dialog de
 * création/édition (voir DialogLogement). Reprend le pattern de OngletCarteRestaurant.
 */
@Component({
  selector: 'app-onglet-logements',
  imports: [DialogLogement],
  templateUrl: './onglet-logements.html',
  styleUrl: './onglet-logements.scss',
})
export class OngletLogements implements OnInit {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly logements = signal<Logement[]>([]);
  readonly meta = signal<ReponseLocationMeta | null>(null);

  readonly filtreDisponibilite = signal('');

  readonly messageErreur = signal<string | null>(null);

  // ---- Dialog logement ----
  readonly dialogOuvert = signal(false);
  readonly logementEnEdition = signal<Logement | null>(null);

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

    this.service.listerLogements(this.prefixe(), this.filtreDisponibilite() || undefined).subscribe({
      next: (logements) => {
        this.chargementEnCours.set(false);
        this.logements.set(logements);
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

  libelleDisponibilite(valeur: string): string {
    return this.meta()?.disponibilites.find((d) => d.valeur === valeur)?.libelle ?? valeur;
  }

  changerDisponibiliteRapide(logement: Logement, disponibilite: string): void {
    if (disponibilite === logement.disponibilite || this.disponibiliteEnCoursId()) {
      return;
    }
    this.disponibiliteEnCoursId.set(logement.id);
    this.messageErreur.set(null);

    this.service.changerDisponibilite(this.prefixe(), logement.id, { disponibilite }).subscribe({
      next: (logementMaj) => {
        this.disponibiliteEnCoursId.set(null);
        this.logements.update((liste) => liste.map((l) => (l.id === logementMaj.id ? logementMaj : l)));
      },
      error: (erreur: unknown) => {
        this.disponibiliteEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerActif(logement: Logement): void {
    if (this.actifEnCoursId()) {
      return;
    }
    const nouvelleValeur = !logement.est_actif;
    this.actifEnCoursId.set(logement.id);
    this.messageErreur.set(null);

    this.service.modifierLogement(this.prefixe(), logement.id, { est_actif: nouvelleValeur }).subscribe({
      next: (logementMaj) => {
        this.actifEnCoursId.set(null);
        this.logements.update((liste) => liste.map((l) => (l.id === logementMaj.id ? logementMaj : l)));
      },
      error: (erreur: unknown) => {
        this.actifEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  ouvrirCreation(): void {
    this.logementEnEdition.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(logement: Logement): void {
    this.logementEnEdition.set(logement);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
    this.charger();
  }

  imagePrincipale(logement: Logement): string | null {
    return logement.images.find((i) => i.est_principale)?.image ?? logement.images[0]?.image ?? null;
  }
}

import { Component, OnInit, inject, input, signal } from '@angular/core';

import { LocationService, PrefixeLocation } from '../location.service';
import { DialogVehicule } from './dialog-vehicule/dialog-vehicule';
import { formaterFrancs } from '../formater-location';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { OptionLocationMeta, ReponseLocationMeta } from '../../../modeles/location-meta.model';
import { OPTIONS_DISPONIBILITE_VEHICULE, Vehicule } from '../../../modeles/vehicule.model';

/**
 * Véhicules du loueur (loueur_voiture) : même structure que OngletLogements (cartes, changement
 * rapide de disponibilité, interrupteur Actif, dialog en sections) et mêmes styles — seuls les
 * champs affichés changent.
 */
@Component({
  selector: 'app-onglet-vehicules',
  imports: [DialogVehicule],
  templateUrl: './onglet-vehicules.html',
  styleUrl: '../onglet-logements/onglet-logements.scss',
})
export class OngletVehicules implements OnInit {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();

  readonly optionsDisponibilite = OPTIONS_DISPONIBILITE_VEHICULE;
  readonly formaterFrancs = formaterFrancs;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly vehicules = signal<Vehicule[]>([]);
  readonly meta = signal<ReponseLocationMeta | null>(null);

  readonly filtreDisponibilite = signal('');

  readonly messageErreur = signal<string | null>(null);

  readonly dialogOuvert = signal(false);
  readonly vehiculeEnEdition = signal<Vehicule | null>(null);

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

    this.service.listerVehicules(this.prefixe(), this.filtreDisponibilite() || undefined).subscribe({
      next: (vehicules) => {
        this.chargementEnCours.set(false);
        this.vehicules.set(vehicules);
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

  libelle(options: OptionLocationMeta[] | undefined, valeur: string, libelleBackend?: string): string {
    if (libelleBackend) return libelleBackend;
    return options?.find((o) => o.valeur === valeur)?.libelle ?? valeur;
  }

  changerDisponibiliteRapide(vehicule: Vehicule, disponibilite: string): void {
    if (disponibilite === vehicule.disponibilite || this.disponibiliteEnCoursId()) {
      return;
    }
    this.disponibiliteEnCoursId.set(vehicule.id);
    this.messageErreur.set(null);

    this.service.changerDisponibiliteVehicule(this.prefixe(), vehicule.id, { disponibilite }).subscribe({
      next: (vehiculeMaj) => {
        this.disponibiliteEnCoursId.set(null);
        this.vehicules.update((liste) => liste.map((v) => (v.id === vehiculeMaj.id ? vehiculeMaj : v)));
      },
      error: (erreur: unknown) => {
        this.disponibiliteEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerActif(vehicule: Vehicule): void {
    if (this.actifEnCoursId()) {
      return;
    }
    this.actifEnCoursId.set(vehicule.id);
    this.messageErreur.set(null);

    this.service.modifierVehicule(this.prefixe(), vehicule.id, { est_actif: !vehicule.est_actif }).subscribe({
      next: (vehiculeMaj) => {
        this.actifEnCoursId.set(null);
        this.vehicules.update((liste) => liste.map((v) => (v.id === vehiculeMaj.id ? vehiculeMaj : v)));
      },
      error: (erreur: unknown) => {
        this.actifEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  ouvrirCreation(): void {
    this.vehiculeEnEdition.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(vehicule: Vehicule): void {
    this.vehiculeEnEdition.set(vehicule);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
    this.charger();
  }

  imagePrincipale(vehicule: Vehicule): string | null {
    return vehicule.images.find((i) => i.est_principale)?.image ?? vehicule.images[0]?.image ?? null;
  }

  titreVehicule(vehicule: Vehicule): string {
    const titre = [vehicule.marque, vehicule.modele, vehicule.annee].filter((p) => !!p).join(' ');
    return titre || vehicule.nom;
  }
}

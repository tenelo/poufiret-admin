import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LocationService, PrefixeLocation } from '../location.service';
import { PucesOptions, basculerDansEnsemble } from '../partage-biens/puces-options';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ReponseLocationMeta } from '../../../modeles/location-meta.model';
import { Etablissement, RequeteEtablissement } from '../../../modeles/hebergement.model';

const OPTIONS_ETOILES = [1, 2, 3, 4, 5];

/**
 * Fiche de l'établissement d'un hôtelier (GET/PATCH P/etablissement/) : type, étoiles, heures
 * d'arrivée et de départ, équipements (puces de la meta), petit-déjeuner, politique d'annulation,
 * conditions. Photos et vue 360° de l'établissement sont celles du partenaire (logo, couverture) :
 * simple rappel avec lien vers ses informations. Styles des formulaires : DialogLogement.
 */
@Component({
  selector: 'app-onglet-etablissement',
  imports: [RouterLink, PucesOptions],
  templateUrl: './onglet-etablissement.html',
  styleUrls: ['../onglet-logements/dialog-logement/dialog-logement.scss', './onglet-etablissement.scss'],
})
export class OngletEtablissement implements OnInit {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();
  readonly estAdmin = input(false);

  readonly optionsEtoiles = OPTIONS_ETOILES;

  readonly meta = signal<ReponseLocationMeta | null>(null);
  readonly etablissement = signal<Etablissement | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly typeEtablissement = signal('');
  readonly etoiles = signal('');
  readonly heureArrivee = signal('');
  readonly heureDepart = signal('');
  readonly equipementsSelectionnes = signal<Set<string>>(new Set());
  readonly petitDejeuner = signal('');
  readonly prixPetitDejeuner = signal('');
  readonly politiqueAnnulation = signal('');
  readonly conditions = signal('');

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  ngOnInit(): void {
    this.service.meta().subscribe({
      next: (meta) => this.meta.set(meta),
      error: () => undefined,
    });
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);
    this.service.obtenirEtablissement(this.prefixe()).subscribe({
      next: (etablissement) => {
        this.chargementEnCours.set(false);
        this.appliquer(etablissement);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private appliquer(e: Etablissement): void {
    this.etablissement.set(e);
    this.typeEtablissement.set(e.type_etablissement ?? '');
    this.etoiles.set(e.etoiles ? String(e.etoiles) : '');
    this.heureArrivee.set((e.heure_arrivee ?? '').slice(0, 5));
    this.heureDepart.set((e.heure_depart ?? '').slice(0, 5));
    this.equipementsSelectionnes.set(new Set(e.equipements_etablissement ?? []));
    this.petitDejeuner.set(e.petit_dejeuner ?? '');
    this.prixPetitDejeuner.set(
      e.prix_petit_dejeuner !== null && e.prix_petit_dejeuner !== undefined ? String(e.prix_petit_dejeuner) : '',
    );
    this.politiqueAnnulation.set(e.politique_annulation ?? '');
    this.conditions.set(e.conditions ?? '');
  }

  basculerEquipement(valeur: string): void {
    this.equipementsSelectionnes.update((ensemble) => basculerDansEnsemble(ensemble, valeur));
  }

  soumettre(): void {
    const prix = this.prixPetitDejeuner().trim();
    const donnees: RequeteEtablissement = {
      type_etablissement: this.typeEtablissement() || undefined,
      etoiles: this.etoiles() ? Number(this.etoiles()) : null,
      heure_arrivee: this.heureArrivee() || null,
      heure_depart: this.heureDepart() || null,
      equipements_etablissement: [...this.equipementsSelectionnes()],
      petit_dejeuner: this.petitDejeuner() || undefined,
      prix_petit_dejeuner: prix && !Number.isNaN(Number(prix)) ? Number(prix) : null,
      politique_annulation: this.politiqueAnnulation().trim(),
      conditions: this.conditions().trim(),
    };

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.service.modifierEtablissement(this.prefixe(), donnees).subscribe({
      next: (etablissement) => {
        this.enregistrementEnCours.set(false);
        this.appliquer(etablissement);
        this.messageSucces.set('Établissement enregistré.');
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

import { Component, OnInit, inject, input, model, output, signal } from '@angular/core';

import { LocationService } from '../location.service';
import { LocaliteQuartierService } from '../../../noyau/geo/localite-quartier.service';
import { CoordonneesGps, PositionGps } from '../../../partage/position-gps/position-gps';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { Departement } from '../../../modeles/departement.model';
import { OptionGeo } from '../../../modeles/geographie.model';

/**
 * Section « Localisation » commune aux dialogs logement et véhicule : cascade Département →
 * Localité → Quartier, secteur, repères et position GPS (composant partagé). Les valeurs saisies
 * sont des `model()` portés par le dialog parent, si bien qu'elles survivent au changement de
 * section (le composant est recréé à chaque affichage et recharge alors ses listes).
 */
@Component({
  selector: 'app-localisation-location',
  imports: [PositionGps],
  templateUrl: './localisation-location.html',
  styleUrl: '../onglet-logements/dialog-logement/dialog-logement.scss',
})
export class LocalisationLocation implements OnInit {
  private readonly service = inject(LocationService);
  private readonly localiteQuartierService = inject(LocaliteQuartierService);

  /** Préfixe des id HTML (dl-, dv-…) pour garder des libellés uniques. */
  readonly prefixeId = input('loc-');
  readonly libelleReperes = input("Repères / indications d'accès");
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);

  readonly departementId = model('');
  readonly localiteId = model('');
  readonly quartierId = model('');
  readonly secteur = model('');
  readonly adresseReperes = model('');

  readonly position = output<CoordonneesGps | null>();

  readonly departements = signal<Departement[]>([]);
  readonly localites = signal<OptionGeo[]>([]);
  readonly chargementLocalites = signal(false);
  readonly erreurLocalites = signal<string | null>(null);
  readonly quartiers = signal<OptionGeo[]>([]);
  readonly chargementQuartiers = signal(false);
  readonly erreurQuartiers = signal<string | null>(null);

  ngOnInit(): void {
    this.service.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => undefined,
    });
    // Préremplissage sans réinitialiser localite/quartier.
    if (this.departementId()) this.chargerLocalites(Number(this.departementId()));
    if (this.localiteId()) this.chargerQuartiers(Number(this.localiteId()));
  }

  changerDepartement(valeur: string): void {
    this.departementId.set(valeur);
    this.localites.set([]);
    this.quartiers.set([]);
    this.localiteId.set('');
    this.quartierId.set('');
    this.erreurLocalites.set(null);
    if (valeur) this.chargerLocalites(Number(valeur));
  }

  changerLocalite(valeur: string): void {
    this.localiteId.set(valeur);
    this.quartiers.set([]);
    this.quartierId.set('');
    this.erreurQuartiers.set(null);
    if (valeur) this.chargerQuartiers(Number(valeur));
  }

  private chargerLocalites(departementId: number): void {
    this.chargementLocalites.set(true);
    this.localiteQuartierService.listerLocalites(departementId).subscribe({
      next: (localites) => {
        this.chargementLocalites.set(false);
        this.localites.set(localites);
      },
      error: (erreur: unknown) => {
        this.chargementLocalites.set(false);
        this.erreurLocalites.set(extraireMessageErreur(erreur));
      },
    });
  }

  private chargerQuartiers(localiteId: number): void {
    this.chargementQuartiers.set(true);
    this.localiteQuartierService.listerQuartiers(localiteId).subscribe({
      next: (quartiers) => {
        this.chargementQuartiers.set(false);
        this.quartiers.set(quartiers);
      },
      error: (erreur: unknown) => {
        this.chargementQuartiers.set(false);
        this.erreurQuartiers.set(extraireMessageErreur(erreur));
      },
    });
  }
}

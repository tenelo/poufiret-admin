import { Component, signal } from '@angular/core';

import { NiveauGeographie } from './niveau-geographie/niveau-geographie';
import { CONFIG_NIVEAUX_GEO, NIVEAUX_GEO, NiveauGeo } from '../../../modeles/geographie.model';

/**
 * Écran admin "Géographie" (capacité gerer_geographie) : un onglet par niveau
 * — Régions, Départements, Localités, Quartiers —, chacun géré par le même
 * composant paramétré NiveauGeographie. Aucun CRUD des districts.
 */
@Component({
  selector: 'app-geographie',
  imports: [NiveauGeographie],
  templateUrl: './geographie.html',
  styleUrl: './geographie.scss',
})
export class Geographie {
  readonly onglets = NIVEAUX_GEO.map((valeur) => ({
    valeur,
    libelle: CONFIG_NIVEAUX_GEO[valeur].libellePluriel,
  }));

  readonly niveauActif = signal<NiveauGeo>('regions');

  changerNiveau(niveau: NiveauGeo): void {
    this.niveauActif.set(niveau);
  }
}

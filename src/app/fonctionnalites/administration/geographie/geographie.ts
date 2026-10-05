import { Component, signal } from '@angular/core';

import { NiveauGeographie } from './niveau-geographie/niveau-geographie';
import { Rapprochement } from './rapprochement/rapprochement';
import { CONFIG_NIVEAUX_GEO, NIVEAUX_GEO, NiveauGeo } from '../../../modeles/geographie.model';

// Les 4 niveaux CRUD, plus l'onglet "Rapprochement" (rattachement des anciens
// textes libres ville/quartier à la géographie structurée — même capacité).
export type OngletGeographie = NiveauGeo | 'rapprochement';

/**
 * Écran admin "Géographie" (capacité gerer_geographie) : un onglet par niveau
 * — Régions, Départements, Localités, Quartiers —, chacun géré par le même
 * composant paramétré NiveauGeographie, plus l'onglet Rapprochement. Aucun
 * CRUD des districts.
 */
@Component({
  selector: 'app-geographie',
  imports: [NiveauGeographie, Rapprochement],
  templateUrl: './geographie.html',
  styleUrl: './geographie.scss',
})
export class Geographie {
  readonly onglets: { valeur: OngletGeographie; libelle: string }[] = [
    ...NIVEAUX_GEO.map((valeur) => ({ valeur, libelle: CONFIG_NIVEAUX_GEO[valeur].libellePluriel })),
    { valeur: 'rapprochement', libelle: 'Rapprochement' },
  ];

  readonly niveauActif = signal<OngletGeographie>('regions');

  changerNiveau(niveau: OngletGeographie): void {
    this.niveauActif.set(niveau);
  }

  estNiveauGeo(valeur: OngletGeographie): valeur is NiveauGeo {
    return valeur !== 'rapprochement';
  }
}

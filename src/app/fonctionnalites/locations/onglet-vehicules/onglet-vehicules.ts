import { Component } from '@angular/core';

import { RessourceBien } from '../location.service';
import { OngletBiensBase } from '../partage-biens/onglet-biens-base';
import { DialogVehicule } from './dialog-vehicule/dialog-vehicule';
import { Vehicule } from '../../../modeles/vehicule.model';

/**
 * Véhicules du loueur (loueur_voiture) : cartes, changement rapide de disponibilité, interrupteur
 * Actif, dialog en sections — logique commune dans OngletBiensBase, styles de OngletLogements.
 */
@Component({
  selector: 'app-onglet-vehicules',
  imports: [DialogVehicule],
  templateUrl: './onglet-vehicules.html',
  styleUrl: '../onglet-logements/onglet-logements.scss',
})
export class OngletVehicules extends OngletBiensBase<Vehicule> {
  protected readonly ressource: RessourceBien = 'vehicules';

  titreVehicule(vehicule: Vehicule): string {
    const titre = [vehicule.marque, vehicule.modele, vehicule.annee].filter((p) => !!p).join(' ');
    return titre || vehicule.nom;
  }
}

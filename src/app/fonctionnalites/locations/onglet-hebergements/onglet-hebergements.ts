import { Component } from '@angular/core';

import { RessourceBien } from '../location.service';
import { OngletBiensBase } from '../partage-biens/onglet-biens-base';
import { DialogHebergement } from './dialog-hebergement/dialog-hebergement';
import { Hebergement } from '../../../modeles/hebergement.model';

/**
 * Hébergements d'un hôtelier (chambres, suites…) : cartes, changement rapide de disponibilité,
 * interrupteur Actif, dialog en sections — logique commune dans OngletBiensBase, styles de
 * OngletLogements.
 */
@Component({
  selector: 'app-onglet-hebergements',
  imports: [DialogHebergement],
  templateUrl: './onglet-hebergements.html',
  styleUrl: '../onglet-logements/onglet-logements.scss',
})
export class OngletHebergements extends OngletBiensBase<Hebergement> {
  protected readonly ressource: RessourceBien = 'hebergements';

  /** « 2 adultes · 1 enfant ». */
  capacite(h: Hebergement): string {
    const parties: string[] = [];
    if (h.capacite_adultes) parties.push(`${h.capacite_adultes} adulte${h.capacite_adultes > 1 ? 's' : ''}`);
    if (h.capacite_enfants) parties.push(`${h.capacite_enfants} enfant${h.capacite_enfants > 1 ? 's' : ''}`);
    return parties.join(' · ') || 'Capacité non renseignée';
  }
}

import { Component, signal } from '@angular/core';

import { OngletPointsPublicites } from './onglet-points-publicites/onglet-points-publicites';
import { OngletGestionPublicites } from './onglet-gestion-publicites/onglet-gestion-publicites';

type SousOnglet = 'points' | 'gestion';

/**
 * Écran "Publicités" de l'espace partenaire : statistiques des campagnes
 * ("Points des Publicités") et gestion (création/soumission, "Gérer mes
 * publicités"), chacun avec son propre chargement.
 */
@Component({
  selector: 'app-publicites',
  imports: [OngletPointsPublicites, OngletGestionPublicites],
  templateUrl: './publicites.html',
  styleUrl: './publicites.scss',
})
export class Publicites {
  readonly sousOngletActif = signal<SousOnglet>('points');

  readonly sousOnglets: { valeur: SousOnglet; libelle: string }[] = [
    { valeur: 'points', libelle: 'Points des Publicités' },
    { valeur: 'gestion', libelle: 'Gérer mes publicités' },
  ];

  changerSousOnglet(onglet: SousOnglet): void {
    this.sousOngletActif.set(onglet);
  }
}

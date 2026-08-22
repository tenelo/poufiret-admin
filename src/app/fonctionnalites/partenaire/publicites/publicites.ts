import { Component, signal } from '@angular/core';

import { OngletPointsPublicites } from './onglet-points-publicites/onglet-points-publicites';
import { OngletGestionPublicites } from './onglet-gestion-publicites/onglet-gestion-publicites';
import { OngletFormulesDisponibles } from './onglet-formules-disponibles/onglet-formules-disponibles';

type SousOnglet = 'points' | 'gestion' | 'formules';

/**
 * Écran "Publicités" de l'espace partenaire : statistiques des campagnes
 * ("Points des Publicités"), gestion (création/soumission, "Gérer mes
 * publicités") et catalogue pédagogique des formules ("Formules
 * disponibles"), chacun avec son propre chargement.
 */
@Component({
  selector: 'app-publicites',
  imports: [OngletPointsPublicites, OngletGestionPublicites, OngletFormulesDisponibles],
  templateUrl: './publicites.html',
  styleUrl: './publicites.scss',
})
export class Publicites {
  readonly sousOngletActif = signal<SousOnglet>('points');

  readonly sousOnglets: { valeur: SousOnglet; libelle: string }[] = [
    { valeur: 'points', libelle: 'Points des Publicités' },
    { valeur: 'gestion', libelle: 'Gérer mes publicités' },
    { valeur: 'formules', libelle: 'Formules disponibles' },
  ];

  changerSousOnglet(onglet: SousOnglet): void {
    this.sousOngletActif.set(onglet);
  }
}

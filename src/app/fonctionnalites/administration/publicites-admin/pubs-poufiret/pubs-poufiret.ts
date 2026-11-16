import { Component, signal } from '@angular/core';

import { PubsMaison } from './pubs-maison/pubs-maison';
import { ParcoursDecouverte } from './parcours-decouverte/parcours-decouverte';
import { ReglagesPoufiretComposant } from './reglages-poufiret/reglages-poufiret';

type SousOngletPoufiret = 'pubs' | 'parcours' | 'reglages';

/**
 * Onglet « Pubs Poufiret » de la page Publicités (capacité gerer_pubs_poufiret, super-admin
 * toujours) : pubs maison du carrousel, parcours « Découvrir Poufiret » et leurs réglages.
 */
@Component({
  selector: 'app-pubs-poufiret',
  imports: [PubsMaison, ParcoursDecouverte, ReglagesPoufiretComposant],
  templateUrl: './pubs-poufiret.html',
  styleUrl: './pubs-poufiret.scss',
})
export class PubsPoufiret {
  readonly sousOngletActif = signal<SousOngletPoufiret>('pubs');

  changerSousOnglet(onglet: SousOngletPoufiret): void {
    this.sousOngletActif.set(onglet);
  }
}

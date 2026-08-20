import { Component, input } from '@angular/core';

import { VueEnsemblePartenaire } from '../../../../../modeles/tableau-de-bord-partenaire.model';
import { formaterFcfa } from '../../formatage';

/** Onglet "Vue d'ensemble" : cartes KPI + carte abonnement. Purement présentationnel. */
@Component({
  selector: 'app-onglet-vue-ensemble',
  imports: [],
  templateUrl: './onglet-vue-ensemble.html',
  styleUrl: './onglet-vue-ensemble.scss',
})
export class OngletVueEnsemble {
  readonly vue = input.required<VueEnsemblePartenaire>();

  readonly formaterFcfa = formaterFcfa;
}

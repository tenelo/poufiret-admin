import { Component, input } from '@angular/core';

import {
  DESCRIPTIONS_TYPE_AFFICHAGE,
  FormulePublicite,
  LIBELLES_TYPE_AFFICHAGE,
} from '../../../../../modeles/publicite.model';

/**
 * Affiches pédagogiques des formules disponibles, en tête de l'onglet
 * "Gérer mes publicités" : pour chaque formule, prix/durée + un petit schéma
 * expliquant où la pub apparaît dans l'app mobile selon ses types d'affichage.
 * Purement présentationnel.
 */
@Component({
  selector: 'app-affiches-formules',
  imports: [],
  templateUrl: './affiches-formules.html',
  styleUrl: './affiches-formules.scss',
})
export class AfficheFormules {
  readonly formules = input.required<FormulePublicite[]>();

  readonly libellesType = LIBELLES_TYPE_AFFICHAGE;
  readonly descriptionsType = DESCRIPTIONS_TYPE_AFFICHAGE;
}

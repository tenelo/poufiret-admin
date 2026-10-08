import { Component, input, output } from '@angular/core';

import { OptionLocationMeta } from '../../../modeles/location-meta.model';

/**
 * Puces à cocher alimentées par la meta (équipements des logements, véhicules, hébergements,
 * établissement) : un seul rendu pour tous les dialogs de l'espace loueur.
 */
@Component({
  selector: 'app-puces-options',
  imports: [],
  template: `
    @if (options().length === 0) {
      <p class="indice">{{ messageVide() }}</p>
    } @else {
      <div class="liste-equipements">
        @for (option of options(); track option.valeur) {
          <label class="case-equipement">
            <input type="checkbox" [checked]="selection().has(option.valeur)" (change)="basculer.emit(option.valeur)" />
            {{ option.libelle }}
          </label>
        }
      </div>
    }
  `,
  styleUrl: '../onglet-logements/dialog-logement/dialog-logement.scss',
})
export class PucesOptions {
  readonly options = input<OptionLocationMeta[]>([]);
  readonly selection = input<Set<string>>(new Set());
  readonly messageVide = input('Aucun équipement disponible.');

  readonly basculer = output<string>();
}

/** Copie d'un ensemble avec la valeur ajoutée ou retirée (sélection des puces). */
export function basculerDansEnsemble(ensemble: Set<string>, valeur: string): Set<string> {
  const copie = new Set(ensemble);
  if (copie.has(valeur)) {
    copie.delete(valeur);
  } else {
    copie.add(valeur);
  }
  return copie;
}

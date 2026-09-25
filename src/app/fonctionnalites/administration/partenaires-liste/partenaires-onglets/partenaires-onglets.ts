import { Component, signal } from '@angular/core';

import { PartenairesListe } from '../partenaires-liste';
import { StatistiquesPartenaires } from '../statistiques-partenaires/statistiques-partenaires';

type OngletPartenaires = 'liste' | 'statistiques';

/**
 * Page admin "Partenaires" en deux onglets : « Liste » (l'écran historique, inchangé) et
 * « Statistiques » (proportions clients / partenaires, répartition des partenaires).
 */
@Component({
  selector: 'app-partenaires-onglets',
  imports: [PartenairesListe, StatistiquesPartenaires],
  templateUrl: './partenaires-onglets.html',
  styleUrl: './partenaires-onglets.scss',
})
export class PartenairesOnglets {
  readonly ongletActif = signal<OngletPartenaires>('liste');

  changerOnglet(onglet: OngletPartenaires): void {
    this.ongletActif.set(onglet);
  }
}

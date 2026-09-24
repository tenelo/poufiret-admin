import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { CascadeGeographie } from '../cascade-geographie';
import { GeographieService } from '../geographie.service';
import {
  CONFIG_NIVEAUX_GEO,
  CorpsGeo,
  ErreursGeo,
  LigneGeo,
  NiveauGeo,
} from '../../../../modeles/geographie.model';

/**
 * Formulaire en dialog (création / édition) d'un élément géographique. Le
 * parent est toujours choisi dans des listes déroulantes en cascade (jamais
 * saisi librement) ; seul le parent direct est envoyé. Ne fait pas l'appel
 * réseau d'écriture : émet le corps, le parent gère l'appel et les erreurs.
 */
@Component({
  selector: 'app-dialog-geographie',
  imports: [],
  templateUrl: './dialog-geographie.html',
  styleUrl: './dialog-geographie.scss',
})
export class DialogGeographie implements OnInit {
  private readonly service = inject(GeographieService);

  readonly niveau = input.required<NiveauGeo>();
  /** Ligne à modifier ; null = création. */
  readonly ligne = input<LigneGeo | null>(null);
  readonly enregistrementEnCours = input(false);
  readonly erreurs = input<ErreursGeo | null>(null);

  readonly soumis = output<CorpsGeo>();
  readonly annule = output<void>();

  readonly config = computed(() => CONFIG_NIVEAUX_GEO[this.niveau()]);

  readonly nom = signal('');
  readonly touche = signal(false);

  // Créée à l'initialisation : dépend des inputs (niveau, ligne).
  cascade!: CascadeGeographie;

  ngOnInit(): void {
    const ligne = this.ligne();
    this.cascade = new CascadeGeographie(this.service, this.config().cascade, !ligne);
    if (ligne) {
      this.nom.set(ligne.nom);
      void this.cascade.preremplir(ligne);
    } else {
      this.cascade.demarrer();
    }
  }

  versId(valeur: string): number | null {
    return valeur ? Number(valeur) : null;
  }

  soumettre(): void {
    this.touche.set(true);
    const nom = this.nom().trim();
    const parentId = this.cascade.parentId();
    if (!nom || parentId === null || this.enregistrementEnCours()) {
      return;
    }
    const cleParent = this.cascade.etapes[this.cascade.etapes.length - 1];
    this.soumis.emit({ nom, [cleParent]: parentId } as CorpsGeo);
  }
}

import { Component, computed, input, output } from '@angular/core';

import { CourseLivraison } from '../../modeles/course-livraison.model';
import { LivreurBureau, iconeVehicule } from '../../modeles/livreur-bureau.model';
import { formaterDateRelativeLivraison } from '../../formatage-livraison';

/**
 * Dialog d'assignation manuelle : liste les livreurs de la ville (en ligne en
 * tête), sélection = assignation immédiate. Un livreur hors ligne reste
 * sélectionnable, avec un avertissement visuel sur sa ligne.
 */
@Component({
  selector: 'app-dialog-assignation',
  imports: [],
  templateUrl: './dialog-assignation.html',
  styleUrl: './dialog-assignation.scss',
})
export class DialogAssignation {
  readonly course = input.required<CourseLivraison>();
  readonly livreurs = input.required<LivreurBureau[]>();
  readonly enCours = input(false);
  readonly livreurEnCoursId = input<string | null>(null);
  readonly messageErreur = input<string | null>(null);

  readonly assigne = output<string>();
  readonly ferme = output<void>();

  readonly iconeVehicule = iconeVehicule;
  readonly formaterDateRelativeLivraison = formaterDateRelativeLivraison;

  readonly livreursTries = computed(() =>
    [...this.livreurs()].sort((a, b) => {
      if (a.statut === b.statut) return a.nom.localeCompare(b.nom);
      return a.statut === 'en_ligne' ? -1 : 1;
    }),
  );

  choisir(livreur: LivreurBureau): void {
    if (this.enCours()) {
      return;
    }
    this.assigne.emit(livreur.id);
  }
}

import { Component, computed, input } from '@angular/core';

import { ReservationConfirmeeBien } from '../../../modeles/bien-location.model';

/**
 * Liste en lecture des réservations confirmées à venir d'un bien (date de fin non dépassée,
 * triées par date de début), avec le nombre d'unités pour les hébergements.
 */
@Component({
  selector: 'app-reservations-confirmees',
  imports: [],
  template: `
    <label>Réservations confirmées à venir</label>
    @if (aVenir().length === 0) {
      <p class="indice">Aucune réservation confirmée à venir.</p>
    } @else {
      <ul class="liste-reservations">
        @for (reservation of aVenir(); track reservation.demande_id) {
          <li>
            Du {{ reservation.date_debut }} au {{ reservation.date_fin }}
            @if (reservation.nb_unites) {
              · {{ reservation.nb_unites }} unité{{ reservation.nb_unites > 1 ? 's' : '' }}
            }
          </li>
        }
      </ul>
    }
  `,
  styleUrls: ['../onglet-logements/dialog-logement/dialog-logement.scss', './partage-biens.scss'],
})
export class ReservationsConfirmees {
  readonly reservations = input<ReservationConfirmeeBien[]>([]);

  readonly aVenir = computed(() => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    return [...this.reservations()]
      .filter((r) => r.date_fin >= aujourdhui)
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  });
}

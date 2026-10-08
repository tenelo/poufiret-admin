import { Component, input, output } from '@angular/core';

/**
 * Confirmation de suppression d'un bien ; après un 409 (le bien a des demandes), propose de le
 * désactiver à la place. La logique est dans DialogBienBase.
 */
@Component({
  selector: 'app-suppression-bien',
  imports: [],
  template: `
    <div class="boite-suppression">
      @if (proposerDesactivation()) {
        <p>
          « {{ nom() }} » a des demandes et ne peut pas être supprimé. Vous pouvez le désactiver : il ne sera plus
          visible dans l'application.
        </p>
        <div class="actions-modale">
          <button type="button" class="bouton-secondaire" (click)="annuler.emit()">Annuler</button>
          <button type="button" class="bouton-principal" [disabled]="enCours()" (click)="desactiver.emit()">
            {{ enCours() ? 'Désactivation…' : 'Désactiver' }}
          </button>
        </div>
      } @else {
        <p>Supprimer définitivement « {{ nom() }} » ?</p>
        <div class="actions-modale">
          <button type="button" class="bouton-secondaire" (click)="annuler.emit()">Annuler</button>
          <button type="button" class="bouton-danger" [disabled]="enCours()" (click)="supprimer.emit()">
            {{ enCours() ? 'Suppression…' : 'Supprimer' }}
          </button>
        </div>
      }
    </div>
  `,
  styleUrls: ['../onglet-logements/dialog-logement/dialog-logement.scss', './partage-biens.scss'],
})
export class SuppressionBien {
  readonly nom = input('');
  readonly enCours = input(false);
  readonly proposerDesactivation = input(false);

  readonly annuler = output<void>();
  readonly supprimer = output<void>();
  readonly desactiver = output<void>();
}

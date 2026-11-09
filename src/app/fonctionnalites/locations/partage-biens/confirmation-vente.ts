import { Component, input, output } from '@angular/core';

/**
 * Confirmation de la bascule « vendu » d'une annonce à vendre (logement ou véhicule), depuis sa
 * carte dans la liste : même principe que SuppressionBien. Styles : onglet-logements.scss (déjà
 * chargé par OngletLogements et OngletVehicules).
 */
@Component({
  selector: 'app-confirmation-vente',
  imports: [],
  template: `
    <div class="boite-confirmation-vente">
      <p>
        {{ vendu() ? 'Remettre « ' + nom() + ' » en vente ?' : 'Marquer « ' + nom() + ' » comme vendu ?' }}
      </p>
      <div class="actions-confirmation-vente">
        <button type="button" class="bouton-secondaire" (click)="annuler.emit()">Annuler</button>
        <button type="button" class="bouton-principal" [disabled]="enCours()" (click)="confirmer.emit()">
          {{ enCours() ? 'Enregistrement…' : vendu() ? 'Remettre en vente' : 'Marquer vendu' }}
        </button>
      </div>
    </div>
  `,
  styleUrl: '../onglet-logements/onglet-logements.scss',
})
export class ConfirmationVente {
  readonly nom = input('');
  /** Vrai si l'annonce est actuellement vendue (l'action proposée est alors « remettre en vente »). */
  readonly vendu = input(false);
  readonly enCours = input(false);

  readonly annuler = output<void>();
  readonly confirmer = output<void>();
}

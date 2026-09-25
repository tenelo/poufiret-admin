import { Component, viewChild } from '@angular/core';

import { GestionFormulesPub } from './gestion-formules-pub/gestion-formules-pub';
import { ParametresPubComponent } from './parametres-pub/parametres-pub';
import { QuotasFormules } from '../../quotas-formules/quotas-formules';

/**
 * Onglet "Formules & paramètres" de la page Publicités admin (capacité gerer_formules_pub) :
 * quotas des formules, gestion des formules et paramètres généraux. Le composant "Quotas des
 * formules" est rechargé après chaque écriture sur une formule.
 */
@Component({
  selector: 'app-formules-parametres-pub',
  imports: [QuotasFormules, GestionFormulesPub, ParametresPubComponent],
  template: `
    <app-quotas-formules />
    <app-gestion-formules-pub (modifie)="rafraichirQuotas()" />
    <app-parametres-pub />
  `,
})
export class FormulesParametresPub {
  private readonly quotas = viewChild(QuotasFormules);

  rafraichirQuotas(): void {
    this.quotas()?.charger();
  }
}

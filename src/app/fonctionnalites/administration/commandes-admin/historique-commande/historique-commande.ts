import { Component, input } from '@angular/core';

import { EvenementHistorique } from '../../../../modeles/commande-admin.model';
import { formaterDateHeure } from '../formater-commande';

/** Frise chronologique de l'historique d'une commande (statut, acteur et rôle, commentaire, date). */
@Component({
  selector: 'app-historique-commande',
  imports: [],
  templateUrl: './historique-commande.html',
  styleUrl: './historique-commande.scss',
})
export class HistoriqueCommande {
  readonly evenements = input.required<EvenementHistorique[]>();

  readonly formaterDateHeure = formaterDateHeure;
}

import { Component, computed, input, output } from '@angular/core';

import { CommandeAdmin } from '../../../../modeles/commande-admin.model';
import { classeAge, formaterAge, formaterDateHeure, formaterMontant } from '../formater-commande';

/**
 * Liste des commandes : tableau sur grand écran, cartes sur mobile, pagination. Ne fait aucun
 * appel réseau : les données et le changement de page viennent du parent.
 */
@Component({
  selector: 'app-liste-commandes',
  imports: [],
  templateUrl: './liste-commandes.html',
  styleUrl: './liste-commandes.scss',
})
export class ListeCommandes {
  readonly commandes = input.required<CommandeAdmin[]>();
  readonly chargementEnCours = input(false);
  readonly erreur = input<string | null>(null);
  readonly total = input(0);
  readonly page = input(1);
  readonly taillePage = input(20);
  /** Commande dont le détail est ouvert (ligne mise en évidence). */
  readonly commandeOuverteId = input<number | null>(null);

  readonly ouvrir = output<number>();
  readonly pageChange = output<number>();
  readonly reessayer = output<void>();

  readonly formaterMontant = formaterMontant;
  readonly formaterAge = formaterAge;
  readonly formaterDateHeure = formaterDateHeure;
  readonly classeAge = classeAge;

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / this.taillePage())));

  /** Statut de livraison + livreur, ou "—" tant qu'aucun livreur n'a été demandé. */
  texteLivraison(commande: CommandeAdmin): string {
    const livraison = commande.livraison;
    if (!livraison) return '—';
    return livraison.livreur_nom
      ? `${livraison.statut_libelle} · ${livraison.livreur_nom}`
      : livraison.statut_libelle;
  }
}

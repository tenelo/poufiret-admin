import { Component, OnInit, inject, signal } from '@angular/core';

import { TableauDeBordPartenaireService } from './tableau-de-bord-partenaire.service';
import { OngletVueEnsemble } from './onglets/onglet-vue-ensemble/onglet-vue-ensemble';
import { OngletProduits } from './onglets/onglet-produits/onglet-produits';
import { OngletCommandes } from './onglets/onglet-commandes/onglet-commandes';
import { extraireMessageErreur } from '../mes-produits/extraire-message-erreur';
import { VueTableauDeBordPartenaire } from '../../../modeles/tableau-de-bord-partenaire.model';

type Onglet = 'ensemble' | 'produits' | 'commandes';

/**
 * Tableau de bord partenaire : vue d'ensemble, produits et commandes, en 3
 * onglets, en lecture seule, agrégés par TableauDeBordPartenaireService.
 * Les statistiques et la gestion des publicités vivent désormais sur leur
 * propre écran ("Publicités" dans le menu latéral).
 */
@Component({
  selector: 'app-tableau-de-bord-partenaire',
  imports: [OngletVueEnsemble, OngletProduits, OngletCommandes],
  templateUrl: './tableau-de-bord-partenaire.html',
  styleUrl: './tableau-de-bord-partenaire.scss',
})
export class TableauDeBordPartenaire implements OnInit {
  private readonly tableauDeBordService = inject(TableauDeBordPartenaireService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly vue = signal<VueTableauDeBordPartenaire | null>(null);

  readonly ongletActif = signal<Onglet>('ensemble');

  readonly onglets: { valeur: Onglet; libelle: string }[] = [
    { valeur: 'ensemble', libelle: "Vue d'ensemble" },
    { valeur: 'produits', libelle: 'Produits' },
    { valeur: 'commandes', libelle: 'Commandes' },
  ];

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.tableauDeBordService.chargerTableauDeBord().subscribe({
      next: (vue) => {
        this.chargementEnCours.set(false);
        this.vue.set(vue);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerOnglet(onglet: Onglet): void {
    this.ongletActif.set(onglet);
  }
}

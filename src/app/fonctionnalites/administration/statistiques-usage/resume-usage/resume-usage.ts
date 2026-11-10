import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { StatistiquesUsageService } from '../statistiques-usage.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterMontant } from '../../commandes-admin/formater-commande';
import { formaterNombre, formaterTaux } from '../../tableau-de-bord-admin/palette-graphiques';
import { FiltresStatistiquesUsage, ResumeUsage } from '../../../../modeles/statistiques-usage.model';

/** Libellés affichés, dans l'ordre souhaité (clés absentes de la réponse ignorées). */
const LIBELLES: [cle: string, libelle: string][] = [
  ['nb_vues_vitrine', 'Vues de vitrine'],
  ['nb_vues_article', "Vues d'article"],
  ['nb_recherches', 'Recherches'],
  ['nb_recherches_sans_resultat', 'Recherches sans résultat'],
  ['taux_clic_recherche', 'Taux de clic recherche'],
  ['nb_contacts_partenaires', 'Contacts partenaires'],
  ['nb_ajouts_panier', 'Ajouts au panier'],
  ['nb_paniers_avec_ajout', 'Paniers avec ajout'],
  ['nb_commandes', 'Commandes'],
  ['nb_commandes_livrees', 'Commandes livrées'],
  ['nb_commandes_annulees', 'Commandes annulées'],
  ['taux_conversion', 'Taux de conversion'],
  ['montant_livre', 'Montant livré'],
];

const CLES_TAUX = new Set(['taux_clic_recherche', 'taux_conversion']);
const CLES_MONTANT = new Set(['montant_livre']);

interface CarteResume {
  cle: string;
  libelle: string;
  valeur: string;
  evolution: string | null;
  sensPositif: boolean | null;
}

function formaterValeur(cle: string, valeur: number): string {
  if (CLES_MONTANT.has(cle)) return formaterMontant(valeur);
  if (CLES_TAUX.has(cle)) return formaterTaux(valeur);
  return formaterNombre(valeur);
}

/** Cartes de chiffres clés (GET resume/) avec l'évolution vs la période précédente de même longueur. */
@Component({
  selector: 'app-resume-usage',
  imports: [],
  templateUrl: './resume-usage.html',
  styleUrl: './resume-usage.scss',
})
export class ResumeUsageSection {
  private readonly service = inject(StatistiquesUsageService);

  readonly filtres = input.required<FiltresStatistiquesUsage>();

  readonly donnees = signal<ResumeUsage | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly cartes = computed<CarteResume[]>(() => {
    const indicateurs = this.donnees()?.indicateurs;
    if (!indicateurs) return [];
    return LIBELLES.filter(([cle]) => cle in indicateurs).map(([cle, libelle]) => {
      const indicateur = indicateurs[cle];
      const evolution = indicateur.evolution;
      return {
        cle,
        libelle,
        valeur: formaterValeur(cle, indicateur.valeur),
        evolution: evolution === null ? null : formaterTaux(Math.abs(evolution)),
        sensPositif: evolution === null ? null : evolution >= 0,
      };
    });
  });

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      untracked(() => this.charger(filtres));
    });
  }

  private charger(filtres: FiltresStatistiquesUsage): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.resume(filtres).subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

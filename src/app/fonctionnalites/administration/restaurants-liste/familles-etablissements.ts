import { OPTIONS_FILTRE_GABARIT } from '../../../modeles/gabarit.model';

/**
 * Deux entrées du menu admin pour la même liste et le même espace établissement
 * (capacité gerer_restaurants) :
 * - « Restaurants » : gabarit restaurant (restaurateurs et fast-food), filtre de gabarit masqué ;
 * - « Commerces » : autres gabarits à catalogue (boulangerie, pharmacie, librairie, mode, élevage).
 * La famille de la liste vient des data de la route (`famille`) ; celle d'un partenaire, de son
 * gabarit (voir familleDuGabarit), pour ramener l'espace établissement vers la bonne liste.
 */
export type FamilleEtablissement = 'restaurants' | 'commerces';

export interface DefinitionFamille {
  titre: string;
  lien: string;
  /** Gabarits listés (code de la meta ; un gabarit absent vaut « restaurant »). */
  gabarits: string[];
  /** Options du filtre de gabarit ; vide = filtre masqué. */
  optionsGabarit: { valeur: string; libelle: string }[];
  placeholderRecherche: string;
  aucun: string;
  aucunFiltre: string;
  chargement: string;
}

const GABARITS_COMMERCES = ['boulangerie', 'pharmacie', 'librairie', 'mode', 'elevage'];

export const FAMILLES_ETABLISSEMENTS: Record<FamilleEtablissement, DefinitionFamille> = {
  restaurants: {
    titre: 'Restaurants',
    lien: '/administration/restaurants',
    gabarits: ['restaurant'],
    optionsGabarit: [],
    placeholderRecherche: 'Rechercher un restaurant ou un département…',
    aucun: 'Aucun restaurant.',
    aucunFiltre: 'Aucun restaurant ne correspond à ces critères.',
    chargement: 'Chargement des restaurants…',
  },
  commerces: {
    titre: 'Commerces',
    lien: '/administration/commerces',
    gabarits: GABARITS_COMMERCES,
    // « Tous » + les gabarits de commerce, mêmes libellés que le filtre historique.
    optionsGabarit: OPTIONS_FILTRE_GABARIT.filter(
      (o) => o.valeur === '' || GABARITS_COMMERCES.includes(o.valeur),
    ),
    placeholderRecherche: 'Rechercher un commerce ou un département…',
    aucun: 'Aucun commerce.',
    aucunFiltre: 'Aucun commerce ne correspond à ces critères.',
    chargement: 'Chargement des commerces…',
  },
};

/** Famille d'un partenaire selon son gabarit (absent ou « restaurant » → Restaurants). */
export function familleDuGabarit(code: string | null | undefined): FamilleEtablissement {
  return GABARITS_COMMERCES.includes(code ?? 'restaurant') ? 'commerces' : 'restaurants';
}

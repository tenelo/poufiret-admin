import { EspaceUtilisateur } from '../../modeles/utilisateur.model';

/**
 * Niveau hiérarchique TeneLivr, dérivé de `espace`. Interne au module
 * livraison — ne dépend que du type `EspaceUtilisateur` (modèle partagé, pas
 * un service spécifique à l'espace admin Poufiret), pour rester extractible.
 */
export type NiveauLivraison = 'coordonnateur' | 'superviseur' | 'gestionnaire';

export function niveauDepuisEspace(espace: EspaceUtilisateur | null | undefined): NiveauLivraison | null {
  switch (espace) {
    case 'coordination_livraison':
      return 'coordonnateur';
    case 'supervision_livraison':
      return 'superviseur';
    case 'gestion_livraison':
      return 'gestionnaire';
    default:
      return null;
  }
}

export function racineNiveau(niveau: NiveauLivraison): string {
  return `/livraison/${niveau}`;
}

export const LIBELLES_NIVEAU: Record<NiveauLivraison, string> = {
  coordonnateur: 'Coordonnateur',
  superviseur: 'Superviseur',
  gestionnaire: 'Gestionnaire',
};

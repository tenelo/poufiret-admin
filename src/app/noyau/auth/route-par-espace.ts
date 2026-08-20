import { EspaceUtilisateur } from '../../modeles/utilisateur.model';

/**
 * Route racine de l'espace web correspondant au champ `espace` de l'utilisateur
 * connecté. Réutilisée par le flux de login (connexion.ts) et par la garde de
 * redirection racine (redirection-racine.guard.ts).
 *
 * Par défaut (espace absent — ex. session mise en cache avant l'ajout de ce
 * champ backend — ou admin/partenaire) : comportement historique inchangé,
 * on renvoie vers /tableau-de-bord plutôt que de risquer d'écarter une
 * session existante.
 */
export function routeParEspace(espace: EspaceUtilisateur | null | undefined): string {
  switch (espace) {
    case 'coordination_livraison':
      return '/livraison/coordonnateur';
    case 'supervision_livraison':
      return '/livraison/superviseur';
    case 'gestion_livraison':
      return '/livraison/gestionnaire';
    case 'client':
    case 'livreur':
      return '/espace-mobile';
    case 'super_admin':
    case 'admin':
    case 'partenaire':
    default:
      return '/tableau-de-bord';
  }
}

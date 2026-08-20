import {
  ComptesAdmin,
  ConnexionsDistinctesAdmin,
  EnLigneAdmin,
  OuverturesAdmin,
} from './tableau-bord-admin.model';

/**
 * Reflète GET /analytics/admin/stats-connexion/ (StatsConnexionAdminView).
 * Mêmes formes que le tableau de bord admin pour en_ligne/comptes/
 * connexions_distinctes/ouvertures (réutilisées telles quelles) — cet écran
 * n'ajoute que `genere_le` et se concentre sur l'export détaillé des sessions.
 */
export interface StatsConnexion {
  genere_le: string;
  en_ligne: EnLigneAdmin;
  comptes: ComptesAdmin;
  connexions_distinctes: ConnexionsDistinctesAdmin;
  ouvertures: OuverturesAdmin;
}

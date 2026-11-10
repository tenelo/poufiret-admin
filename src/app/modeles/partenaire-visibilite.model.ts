/**
 * Reflète PATCH/GET /administration/partenaires/<id>/visibilite/, POST .../supprimer/ et
 * POST .../restaurer/ (apps.administration.views_visibilite côté backend) : actif/inactif
 * (est_visible, capacité masquer_partenaire), suppression douce (capacité
 * supprimer_soft_partenaire) et restauration (capacité restaurer_partenaire) d'un partenaire,
 * utilisés depuis les listes Partenaires, Restaurants, Commerces et Locations, et depuis le
 * formulaire d'édition d'un partenaire (voir PartenaireVisibiliteService).
 */
export interface EtatVisibilitePartenaire {
  id: number;
  nom_commerce: string;
  statut: string;
  statut_libelle: string;
  /** Actif/inactif côté admin (bascule masquer_partenaire) : visible dans l'app si true. */
  est_visible: boolean;
  /** Suppression douce (récupérable via « Restaurer »). */
  est_supprime: boolean;
  supprime_le: string | null;
  /** Dérivé (apps.users.visibilite.partenaire_est_public) : visible publiquement en ce moment. */
  est_public: boolean;
}

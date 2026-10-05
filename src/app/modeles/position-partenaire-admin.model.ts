/**
 * Reflète PATCH /administration/partenaires/<id>/position/ (composant partagé
 * "Position du commerce", fiche partenaire admin). Capacité requise côté backend :
 * `creer_partenaire` (super-admin toujours autorisé).
 */

export interface RequeteModifierPositionPartenaire {
  latitude: number | null;
  longitude: number | null;
}

export interface ReponsePositionPartenaire {
  latitude: number | null;
  longitude: number | null;
  position_modifiee_le: string | null;
  position_modifiee_par_role: string | null;
  // Avertissement optionnel du backend après enregistrement (ex. point hors zone de
  // couverture) — absent si rien à signaler.
  avertissement_position?: string | null;
}

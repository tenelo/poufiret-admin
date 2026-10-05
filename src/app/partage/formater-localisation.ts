/** Champs de localisation communs à ProfilPartenaire et PartenaireListe. */
export interface ChampsLocalisation {
  quartier_nom?: string | null;
  localite_nom?: string | null;
  departement_nom?: string | null;
  // Anciens champs texte, utilisés en repli si le partenaire n'a pas encore été rapproché.
  quartier?: string | null;
  ville?: string | null;
}

/**
 * « Quartier, Localité (Département) » à partir des noms rattachés, sinon repli sur
 * les anciens champs texte libres (ville/quartier). "—" si tout est vide.
 */
export function formaterLocalisation(champs: ChampsLocalisation): string {
  const quartier = champs.quartier_nom || champs.quartier || '';
  const localite = champs.localite_nom || champs.ville || '';
  const principal = [quartier, localite].filter(Boolean).join(', ');

  if (champs.departement_nom) {
    return principal ? `${principal} (${champs.departement_nom})` : `(${champs.departement_nom})`;
  }
  return principal || '—';
}

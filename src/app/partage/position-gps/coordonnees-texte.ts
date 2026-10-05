/**
 * Extraction de coordonnées GPS depuis un texte collé (lien Google Maps ou
 * coordonnées brutes) et vérification grossière d'appartenance à la Côte d'Ivoire.
 * Fonctions pures, sans dépendance Angular — testables isolément.
 */

export type ResultatExtractionCoordonnees =
  | { trouve: true; latitude: number; longitude: number }
  | { trouve: false; lienCourt: boolean };

// Formats reconnus : .../@lat,lng,...z (lien "place"), ?q=lat,lng ou &q=lat,lng
// (lien de recherche), et "lat, lng" saisi directement.
const MOTIFS_COORDONNEES: RegExp[] = [
  /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  /^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/,
];

/** Extrait {latitude, longitude} d'un lien Google Maps ou de coordonnées brutes. */
export function extraireCoordonneesTexte(texte: string): ResultatExtractionCoordonnees {
  const valeur = texte.trim();
  if (!valeur) {
    return { trouve: false, lienCourt: false };
  }

  // Un lien court (goo.gl) ne peut pas être résolu côté navigateur (pas d'appel réseau
  // cross-origin possible depuis ici) : on le signale distinctement du "non reconnu".
  if (/goo\.gl/i.test(valeur)) {
    return { trouve: false, lienCourt: true };
  }

  for (const motif of MOTIFS_COORDONNEES) {
    const correspondance = valeur.match(motif);
    if (!correspondance) {
      continue;
    }
    const latitude = Number(correspondance[1]);
    const longitude = Number(correspondance[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { trouve: true, latitude, longitude };
    }
  }

  return { trouve: false, lienCourt: false };
}

// Rectangle englobant large de la Côte d'Ivoire (marge incluse) — vérification
// grossière pour avertir, pas une frontière précise.
const BORNES_COTE_DIVOIRE = { latMin: 4.0, latMax: 10.8, lngMin: -8.7, lngMax: -2.4 };

/** True si le point est manifestement hors de Côte d'Ivoire (vérification grossière). */
export function estHorsCoteDIvoire(latitude: number, longitude: number): boolean {
  return (
    latitude < BORNES_COTE_DIVOIRE.latMin ||
    latitude > BORNES_COTE_DIVOIRE.latMax ||
    longitude < BORNES_COTE_DIVOIRE.lngMin ||
    longitude > BORNES_COTE_DIVOIRE.lngMax
  );
}

/**
 * "Modifiée par l'administration/le partenaire le …", ou null si jamais modifiée.
 * Rôle supposé 'admin'/'partenaire' (mêmes valeurs qu'AuthService.role()).
 */
export function formaterMentionModificationPosition(
  modifieeLe: string | null,
  modifieeParRole: string | null,
): string | null {
  if (!modifieeLe) {
    return null;
  }
  const qui = modifieeParRole === 'admin' ? "l'administration" : modifieeParRole === 'partenaire' ? 'le partenaire' : null;
  const date = new Date(modifieeLe).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return qui ? `Modifiée par ${qui} le ${date}` : `Modifiée le ${date}`;
}

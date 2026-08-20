/** Déclenche le téléchargement navigateur d'un blob via un <a> object URL éphémère. */
export function declencherTelechargementFichier(blob: Blob, nomFichier: string): void {
  const url = URL.createObjectURL(blob);

  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.click();

  URL.revokeObjectURL(url);
}

/** Ex. nomFichierHorodate('partenaires', 'csv') -> "partenaires-2026-08-20T10-15-00-000Z.csv". */
export function nomFichierHorodate(prefixe: string, extension: string): string {
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefixe}-${horodatage}.${extension}`;
}

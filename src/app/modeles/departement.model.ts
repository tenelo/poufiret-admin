/** Reflète GET /geo/departements/ (lecture seule, régions/districts déjà résolus en noms). */
export interface Departement {
  id: number;
  nom: string;
  region: string;
  district: string;
}

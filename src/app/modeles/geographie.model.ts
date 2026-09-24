/**
 * Reflète les endpoints /administration/geo/<niveau>/ (gestion de la
 * géographie : régions, départements, localités, quartiers). Les districts
 * ne sont exposés qu'en lecture (options du parent des régions).
 */

export type NiveauGeo = 'regions' | 'departements' | 'localites' | 'quartiers';

// Maillons de la hiérarchie, du plus haut au plus bas. Sert à la fois de clé
// de paramètre de requête (?region=, ?departement=...) et de clé de corps.
export type EtapeGeo = 'district' | 'region' | 'departement' | 'localite';

export type EndpointGeo = 'districts' | NiveauGeo;

export interface LigneGeo {
  id: number;
  nom: string;
  actif: boolean;
  parent_id: number;
  parent_nom: string;
  nb_enfants: number;
  cree_le: string;
  modifie_le: string;
  // Noms des ancêtres, présents selon le niveau.
  district_nom?: string;
  region_nom?: string;
  departement_nom?: string;
  localite_nom?: string;
}

export interface OptionGeo {
  id: number;
  nom: string;
}

export interface ReponseOptionsGeo {
  resultats: OptionGeo[];
}

export type FiltreActifGeo = '' | 'true' | 'false';

export interface FiltresGeo {
  search?: string;
  actif?: FiltreActifGeo;
  // Id du parent direct (dernier maillon de la cascade), sous la clé du niveau parent.
  parent?: number | null;
}

// Corps de POST/PATCH : {nom, actif?, <parent>: id}.
export type CorpsGeo = { nom?: string; actif?: boolean } & Partial<Record<EtapeGeo, number>>;

export interface ErreursGeo {
  nom: string | null;
  parent: string | null;
  general: string | null;
}

export interface ConfigNiveauGeo {
  libelle: string;
  libellePluriel: string;
  // Cascade des listes déroulantes (filtres et formulaire) ; le dernier maillon
  // est le parent direct, seul envoyé au backend.
  cascade: EtapeGeo[];
  // Libellé de la colonne "nb_enfants" (null : niveau sans enfants affichés).
  libelleEnfants: string | null;
}

export const ETAPES_GEO: Record<EtapeGeo, { libelle: string; endpoint: EndpointGeo }> = {
  district: { libelle: 'District', endpoint: 'districts' },
  region: { libelle: 'Région', endpoint: 'regions' },
  departement: { libelle: 'Département', endpoint: 'departements' },
  localite: { libelle: 'Localité', endpoint: 'localites' },
};

// Champ de LigneGeo portant le nom de l'ancêtre de chaque maillon.
export const CHAMP_NOM_ETAPE: Record<EtapeGeo, keyof LigneGeo> = {
  district: 'district_nom',
  region: 'region_nom',
  departement: 'departement_nom',
  localite: 'localite_nom',
};

export const NIVEAUX_GEO: NiveauGeo[] = ['regions', 'departements', 'localites', 'quartiers'];

export const CONFIG_NIVEAUX_GEO: Record<NiveauGeo, ConfigNiveauGeo> = {
  regions: {
    libelle: 'région',
    libellePluriel: 'Régions',
    cascade: ['district'],
    libelleEnfants: 'Départements',
  },
  departements: {
    libelle: 'département',
    libellePluriel: 'Départements',
    cascade: ['region'],
    libelleEnfants: 'Localités',
  },
  localites: {
    libelle: 'localité',
    libellePluriel: 'Localités',
    cascade: ['region', 'departement'],
    libelleEnfants: 'Quartiers',
  },
  quartiers: {
    libelle: 'quartier',
    libellePluriel: 'Quartiers',
    cascade: ['region', 'departement', 'localite'],
    libelleEnfants: null,
  },
};

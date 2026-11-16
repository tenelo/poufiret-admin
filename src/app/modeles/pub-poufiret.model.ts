/**
 * Reflète /publicites/admin/poufiret/... (capacité gerer_pubs_poufiret, super-admin toujours) :
 * pubs maison du carrousel, écrans du parcours « Découvrir Poufiret » et réglages. Voir
 * apps/publicites/serializers_poufiret.py et views_poufiret.py (dépôt poufiret-backend).
 */

export type PorteePubPoufiret = 'tout' | 'region' | 'departement';

export const OPTIONS_PORTEE_POUFIRET: { valeur: PorteePubPoufiret; libelle: string }[] = [
  { valeur: 'tout', libelle: 'Tout le monde' },
  { valeur: 'region', libelle: 'Une région' },
  { valeur: 'departement', libelle: 'Un département' },
];

/** Ligne de GET /admin/poufiret/pubs/ (PubPoufiretAdminSerializer). */
export interface PubPoufiretAdmin {
  id: string;
  titre: string;
  texte: string;
  // URL absolue fournie par le backend telle quelle.
  image_couverture: string | null;
  categorie: number | null;
  categorie_nom: string | null;
  // false si la catégorie (ou un de ses parents) est désactivée/archivée/supprimée.
  categorie_disponible: boolean;
  est_active: boolean;
  ordre: number;
  date_debut: string | null;
  date_fin: string | null;
  portee: PorteePubPoufiret;
  region: number | null;
  departement: number | null;
  nb_impressions: number;
  nb_clics: number;
  taux_clic: number;
  nb_personnes_touchees: number;
  impressions_par_type: Record<string, number>;
  cree_le: string;
  modifie_le: string;
}

export interface ReponsePubsPoufiretAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: PubPoufiretAdmin[];
}

export type FiltreActifPubPoufiret = '' | 'true' | 'false';

export interface FiltresPubsPoufiretAdmin {
  estActive: FiltreActifPubPoufiret;
  page: number;
  pageSize: number;
}

export const FILTRES_PUBS_POUFIRET_DEFAUT: FiltresPubsPoufiretAdmin = {
  estActive: '',
  page: 1,
  pageSize: 25,
};

/** Corps de création/modification (multipart si une image est fournie). */
export interface RequetePubPoufiretAdmin {
  titre: string;
  texte?: string;
  // Obligatoire à la création ; absente en modification = image inchangée.
  imageCouverture?: File;
  categorie: number;
  estActive?: boolean;
  dateDebut?: string | null;
  dateFin?: string | null;
  portee: PorteePubPoufiret;
  region?: number | null;
  departement?: number | null;
}

/** Ligne de GET /admin/poufiret/ecrans/ (EcranDecouverteAdminSerializer). */
export interface EcranDecouverteAdmin {
  id: string;
  ordre: number;
  image: string | null;
  titre: string;
  texte: string;
  bouton_libelle: string;
  bouton_categorie: number | null;
  bouton_categorie_nom: string | null;
  bouton_categorie_disponible: boolean | null;
  est_actif: boolean;
  cree_le: string;
  modifie_le: string;
}

export interface ReponseEcransDecouverteAdmin {
  ecrans: EcranDecouverteAdmin[];
}

/** Corps de création/modification (multipart si une image est fournie). */
export interface RequeteEcranDecouverteAdmin {
  titre: string;
  texte?: string;
  // Obligatoire à la création ; absente en modification = image inchangée.
  image?: File;
  // Le bouton demande les deux (libellé ET catégorie) ou aucun des deux.
  boutonLibelle?: string;
  boutonCategorie?: number | null;
  estActif?: boolean;
}

export interface ReponsePublierParcours {
  version_parcours: number;
  nb_ecrans: number;
  parcours_actif: boolean;
}

/** GET/PATCH /admin/poufiret/reglages/ (ParametresPoufiretSerializer). */
export interface ReglagesPoufiret {
  pubs_maison_actives: boolean;
  frequence_pub_maison: number;
  duree_affichage_secondes: number;
  parcours_actif: boolean;
  version_parcours: number;
  modifie_le: string;
}

export interface RequeteReglagesPoufiret {
  pubsMaisonActives?: boolean;
  frequencePubMaison?: number;
  dureeAffichageSecondes?: number;
  parcoursActif?: boolean;
}

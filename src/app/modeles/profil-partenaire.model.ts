/**
 * Reflète le modèle ProfilPartenaire exposé par le backend Django
 * (GET/PATCH /auth/mon-profil-partenaire/).
 */

export interface ProfilPartenaire {
  // Id du ProfilPartenaire (pas celui du User) — c'est cet id qu'attendent les endpoints
  // qui référencent "le partenaire" ailleurs dans l'API (ex. ?partenaire=<id> sur les articles).
  id: number;

  // Champs modifiables par le partenaire.
  nom_commerce: string;
  description: string;
  logo: string | null;
  photo_couverture: string | null;
  type_partenaire: string;
  adresse: string;
  secteur: string;
  // Localisation structurée (P2) : seuls localite_id/quartier_id sont modifiables par le
  // partenaire — departement ne l'est plus (piloté par l'administration).
  localite_id: number | null;
  localite_nom: string | null;
  quartier_id: number | null;
  quartier_nom: string | null;
  // Anciens champs texte libres, conservés en lecture seule pour le repli d'affichage et
  // l'indice "Ancienne saisie" tant que le partenaire n'a pas été rapproché (P2).
  quartier: string;
  ville: string;
  // departement (FK id) et latitude/longitude : non confirmés dans la doc API
  // déjà vérifiée pour mon-profil-partenaire (voir reference_api_poufiret_auth) —
  // ajoutés de façon défensive pour ce chantier (affichage "non renseigné" si
  // absents, à vérifier lors du test manuel).
  departement: number | null;
  departement_nom?: string;
  latitude: number | null;
  longitude: number | null;
  // Horodatage/rôle du dernier changement de position (composant partagé "Position du
  // commerce") ; absents si jamais modifiée. Valeurs de rôle supposées 'admin'/'partenaire'
  // (mêmes valeurs qu'AuthService.role()) — non confirmé verbatim par le backend.
  position_modifiee_le?: string | null;
  position_modifiee_par_role?: string | null;
  description_acces: string;
  telephone_pro: string;
  whatsapp: string;
  email_pro: string;

  // Champs en lecture seule : pilotés par l'administration, affichés mais non modifiables ici.
  statut: string;
  statut_libelle: string;
  est_visible: boolean;
  badge_certifie: boolean;
  est_faveur: boolean;
  plan_libelle: string;
  // Portée du forfait (departement / region / district) ; absente si le backend ne l'expose pas.
  portee_forfait?: string | null;
  abonnement_fin: string | null;
  nb_vues: number;
  type_partenaire_libelle: string;
  nb_photos_par_article: number;
  nb_articles_max: number;
}

// Corps de la requête PATCH /auth/mon-profil-partenaire/ : sous-ensemble des champs modifiables.
// departement et les anciens champs texte ville/quartier ne sont plus envoyés (P2) : la
// localisation s'écrit désormais via localite_id/quartier_id.
export type RequeteMiseAJourProfilPartenaire = Partial<
  Pick<
    ProfilPartenaire,
    | 'nom_commerce'
    | 'description'
    | 'type_partenaire'
    | 'adresse'
    | 'secteur'
    | 'localite_id'
    | 'quartier_id'
    | 'latitude'
    | 'longitude'
    | 'description_acces'
    | 'telephone_pro'
    | 'whatsapp'
    | 'email_pro'
  >
>;

// Valeurs connues de "type_partenaire" pour peupler le sélecteur du formulaire.
// La liste n'est pas forcément exhaustive côté backend : si le profil chargé contient
// une valeur absente d'ici, elle est tout de même ajoutée dynamiquement à la liste affichée.
export const OPTIONS_TYPE_PARTENAIRE: { valeur: string; libelle: string }[] = [
  { valeur: 'restaurateur', libelle: 'Restaurateur' },
  { valeur: 'pharmacien', libelle: 'Pharmacien' },
  { valeur: 'boulanger', libelle: 'Boulanger' },
  { valeur: 'commercant', libelle: 'Commerçant' },
  { valeur: 'libraire', libelle: 'Libraire' },
  { valeur: 'couturier', libelle: 'Couturier' },
  { valeur: 'coiffeur', libelle: 'Coiffeur' },
  { valeur: 'electricien', libelle: 'Électricien' },
  { valeur: 'menuisier', libelle: 'Menuisier' },
  { valeur: 'macon', libelle: 'Maçon' },
  { valeur: 'mecanicien', libelle: 'Mécanicien' },
  { valeur: 'hotelier', libelle: 'Hôtelier' },
  { valeur: 'loueur_maison', libelle: 'Loueur de maison' },
  { valeur: 'loueur_voiture', libelle: 'Loueur de voiture' },
  { valeur: 'plombier', libelle: 'Plombier' },
];

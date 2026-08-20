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
  quartier: string;
  secteur: string;
  ville: string;
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
  abonnement_fin: string | null;
  nb_vues: number;
  type_partenaire_libelle: string;
  nb_photos_par_article: number;
  nb_articles_max: number;
}

// Corps de la requête PATCH /auth/mon-profil-partenaire/ : sous-ensemble des champs modifiables.
export type RequeteMiseAJourProfilPartenaire = Partial<
  Pick<
    ProfilPartenaire,
    | 'nom_commerce'
    | 'description'
    | 'type_partenaire'
    | 'adresse'
    | 'quartier'
    | 'secteur'
    | 'ville'
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

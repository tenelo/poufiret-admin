/**
 * Reflète POST /auth/partenaires/creer/ (CreerPartenaireParAdminView).
 */

export type TypePartenaireCreation =
  | 'commercant'
  | 'pharmacien'
  | 'boulanger'
  | 'restaurateur'
  | 'couturier'
  | 'menuisier'
  | 'plombier'
  | 'electricien'
  | 'macon'
  | 'coiffeur'
  | 'libraire'
  | 'hotelier'
  | 'mecanicien'
  | 'loueur_maison'
  | 'loueur_voiture'
  | 'autre';

export const OPTIONS_TYPE_PARTENAIRE_CREATION: { valeur: TypePartenaireCreation; libelle: string }[] = [
  { valeur: 'commercant', libelle: 'Commerçant' },
  { valeur: 'pharmacien', libelle: 'Pharmacien' },
  { valeur: 'boulanger', libelle: 'Boulanger' },
  { valeur: 'restaurateur', libelle: 'Restaurateur' },
  { valeur: 'couturier', libelle: 'Couturier' },
  { valeur: 'menuisier', libelle: 'Menuisier' },
  { valeur: 'plombier', libelle: 'Plombier' },
  { valeur: 'electricien', libelle: 'Électricien' },
  { valeur: 'macon', libelle: 'Maçon' },
  { valeur: 'coiffeur', libelle: 'Coiffeur' },
  { valeur: 'libraire', libelle: 'Libraire' },
  { valeur: 'hotelier', libelle: 'Hôtelier' },
  { valeur: 'mecanicien', libelle: 'Mécanicien' },
  { valeur: 'loueur_maison', libelle: 'Loueur de maison' },
  { valeur: 'loueur_voiture', libelle: 'Loueur de voiture' },
  { valeur: 'autre', libelle: 'Autre' },
];

// Corps de POST /auth/partenaires/creer/ : seuls telephone et nom_commerce sont requis,
// le reste ne doit être envoyé que si réellement renseigné.
export interface RequeteCreationPartenaire {
  telephone: string;
  nom_commerce: string;
  prenom?: string;
  nom?: string;
  type_partenaire?: TypePartenaireCreation;
  description?: string;
  adresse?: string;
  quartier?: string;
  secteur?: string;
  ville?: string;
  departement?: number;
  telephone_pro?: string;
  whatsapp?: string;
  email_pro?: string;
  plan_id?: number;
  categories?: number[];
}

export interface ReponseCreationPartenaire {
  partenaire_id: number;
  telephone: string;
  nom_commerce: string;
  statut: string;
  // Nom de champ trompeur côté backend : c'est le PIN à 4 chiffres EN CLAIR,
  // renvoyé une seule fois, jamais récupérable ensuite.
  pin_par_defaut: string;
  message: string;
}

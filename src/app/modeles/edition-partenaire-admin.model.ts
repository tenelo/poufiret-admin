/**
 * Reflète GET/PATCH /administration/partenaires/<id>/edition/ (droit : super-admin
 * ou creer_partenaire) : modification des informations d'un partenaire existant, en
 * réutilisant le formulaire de création en mode édition (voir CreationPartenaire).
 * <id> = ProfilPartenaire.pk, même identifiant que la fiche partenaire admin.
 */

export interface CategorieEditionPartenaire {
  id: number;
  nom: string;
}

export interface ReponseEditionPartenaire {
  id: number;
  prenom: string;
  nom: string;
  nom_commerce: string;
  description: string;
  type_partenaire: string;
  categories: CategorieEditionPartenaire[];
  departement: number | null;
  departement_nom: string | null;
  localite_id: number | null;
  localite_nom: string | null;
  quartier_id: number | null;
  quartier_nom: string | null;
  secteur: string;
  adresse: string;
  telephone_pro: string;
  whatsapp: string;
  /** Bouton WhatsApp externe (en plus de la messagerie interne) : affiché publiquement si actif
   *  ET whatsapp exploitable (voir whatsapp_externe, numéro normalisé qui en résulte, sinon null). */
  whatsapp_externe_actif: boolean;
  whatsapp_externe: string | null;
  email_pro: string;
  logo: string | null;
  photo_couverture: string | null;
}

// Corps de PATCH (multipart si logo/photo_couverture) : seuls les champs réellement
// modifiés sont envoyés (voir construirePayloadEdition() dans CreationPartenaire).
export interface RequeteEditionPartenaire {
  prenom?: string;
  nom?: string;
  nom_commerce?: string;
  description?: string;
  type_partenaire?: string;
  categories?: number[];
  departement?: number | null;
  localite_id?: number | null;
  quartier_id?: number | null;
  secteur?: string;
  adresse?: string;
  telephone_pro?: string;
  whatsapp?: string;
  whatsapp_externe_actif?: boolean;
  email_pro?: string;
  logo?: File;
  photo_couverture?: File;
  supprimer_logo?: boolean;
  supprimer_couverture?: boolean;
}

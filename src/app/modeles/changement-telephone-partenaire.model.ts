/**
 * Reflète POST /administration/partenaires/<id>/changer-telephone/ et
 * GET /administration/partenaires/<id>/historique-telephone/ (capacité
 * modifier_identifiant_partenaire, privilégiée). <id> = le même identifiant que celui de la fiche
 * partenaire admin (liste Partenaires).
 */

// Corps de POST .../changer-telephone/.
export interface RequeteChangerTelephone {
  // Numéro complet, préfixe "+225" inclus.
  nouveau_telephone: string;
  motif: string;
  aussi_telephone_pro: boolean;
}

export interface ReponseChangerTelephone {
  id: number;
  telephone: string;
  telephone_pro: string;
  whatsapp: string;
  message: string;
}

export interface EntreeHistoriqueTelephone {
  ancien: string;
  nouveau: string;
  motif: string;
  auteur_nom: string;
  cree_le: string;
}

export interface ReponseHistoriqueTelephone {
  resultats: EntreeHistoriqueTelephone[];
}

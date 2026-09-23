/**
 * Reflète GET /administration/interventions/ (lecture seule, protégé par la
 * capacité `voir_interventions`).
 */

export type StatutIntervention =
  | 'en_attente'
  | 'acceptee'
  | 'refusee'
  | 'en_cours'
  | 'terminee'
  | 'annulee';

export interface InterventionAdmin {
  id: number;
  numero: string;
  statut: StatutIntervention;
  statut_libelle: string;
  type_intervention: string;
  type_libre: string;
  description: string;
  urgence: string;
  urgence_libelle: string;
  client_telephone: string;
  client_nom: string;
  artisan_id: number;
  artisan_nom: string;
  artisan_type: string;
  adresse_snapshot: string;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  acceptee_le: string | null;
  terminee_le: string | null;
}

export interface ReponseInterventionsAdmin {
  total: number;
  resultats: InterventionAdmin[];
}

export const OPTIONS_STATUT_INTERVENTION: { valeur: StatutIntervention | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'acceptee', libelle: 'Acceptée' },
  { valeur: 'refusee', libelle: 'Refusée' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminee', libelle: 'Terminée' },
  { valeur: 'annulee', libelle: 'Annulée' },
];

export function classeChipStatutIntervention(statut: StatutIntervention): string {
  switch (statut) {
    case 'en_attente':
      return 'badge-en-attente';
    case 'acceptee':
      return 'badge-acceptee';
    case 'refusee':
      return 'badge-refusee';
    case 'en_cours':
      return 'badge-en-cours';
    case 'terminee':
      return 'badge-terminee';
    case 'annulee':
      return 'badge-annulee';
  }
}

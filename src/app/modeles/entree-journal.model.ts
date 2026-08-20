/**
 * Reflète GET /administration/moderation/journal/ (JournalModerationView).
 * Renvoie au maximum les 200 entrées les plus récentes — `total` peut donc
 * dépasser `entrees.length` : c'est le nombre réel d'entrées en base, pas la
 * taille du tableau renvoyé.
 */

export interface EntreeJournal {
  date: string;
  action: string;
  action_libelle: string;
  acteur: string;
  cible: string;
  cible_role: string;
  motif: string;
}

export interface ReponseJournalAudit {
  total: number;
  entrees: EntreeJournal[];
}

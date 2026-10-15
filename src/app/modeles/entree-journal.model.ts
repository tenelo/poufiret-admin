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
  // Plusieurs événements identiques regroupés en une seule ligne (ex. 5 tentatives de connexion
  // ratées de suite) : > 1 affiche « ×N » et la date de la dernière occurrence (voir `date` pour la
  // première).
  occurrences: number;
  derniere_occurrence: string;
}

export interface ReponseJournalAudit {
  total: number;
  entrees: EntreeJournal[];
}

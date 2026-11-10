import { PeriodeUsageChoix } from '../../../modeles/statistiques-usage.model';

const JOURS_PAR_CHOIX: Record<Exclude<PeriodeUsageChoix, 'perso'>, number> = { '7j': 7, '30j': 30, '90j': 90 };

function formaterDateIso(date: Date): string {
  const annee = date.getFullYear();
  const mois = (date.getMonth() + 1).toString().padStart(2, '0');
  const jour = date.getDate().toString().padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

/**
 * Bornes `du`/`au` (incluses, YYYY-MM-DD, aujourd'hui inclus) pour un choix de période ;
 * 'perso' renvoie simplement les bornes fournies par l'admin.
 */
export function bornesPeriodeUsage(
  choix: PeriodeUsageChoix,
  du: string,
  au: string,
): { du: string; au: string } {
  if (choix === 'perso') {
    return { du, au };
  }
  const aujourdHui = new Date();
  const debut = new Date(aujourdHui);
  debut.setDate(debut.getDate() - (JOURS_PAR_CHOIX[choix] - 1));
  return { du: formaterDateIso(debut), au: formaterDateIso(aujourdHui) };
}

import { ChartConfiguration } from 'chart.js';

/**
 * Rend un graphique Chart.js cliquable : le curseur devient une main au survol d'un segment et un
 * clic appelle `action(index)` (index du segment dans les données du graphique).
 */
export function optionsCliquables(
  action: (index: number) => void,
  base: ChartConfiguration['options'] = {},
): ChartConfiguration['options'] {
  return {
    ...base,
    onClick: (_evenement, elements) => {
      if (elements.length > 0) action(elements[0].index);
    },
    onHover: (evenement, elements) => {
      const cible = evenement.native?.target as HTMLElement | null;
      if (cible) cible.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };
}

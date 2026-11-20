import { CommandeAdmin } from '../../../modeles/commande-admin.model';

/** Ex. 12500 -> "12 500 FCFA". */
export function formaterMontant(valeur: number | null | undefined): string {
  return `${Math.round(valeur ?? 0).toLocaleString('fr-FR')} FCFA`;
}

/** Nom lisible d'un format ou d'une option : texte tel quel, ou champ nom/libelle d'un objet. */
function nomLisible(valeur: unknown): string {
  if (typeof valeur === 'string') return valeur.trim();
  if (typeof valeur === 'number') return String(valeur);
  if (valeur && typeof valeur === 'object') {
    const objet = valeur as Record<string, unknown>;
    for (const cle of ['nom', 'libelle', 'name']) {
      if (typeof objet[cle] === 'string') return (objet[cle] as string).trim();
    }
  }
  // Jamais de « [object Object] » : un objet sans nom n'est pas affiché.
  return '';
}

/**
 * Ligne de commande : nom du format (variante) puis options/suppléments choisis, séparés par
 * « · » — ex. « 1 000 f · Attiéké (offert) · Attiéké en plus ». Chaîne vide si rien à afficher.
 * Partagé par le centre des commandes admin et « Mes commandes » du partenaire.
 */
export function texteFormatEtOptions(variante: unknown, supplements: unknown): string {
  const options = Array.isArray(supplements) ? supplements : supplements ? [supplements] : [];
  return [variante, ...options].map(nomLisible).filter((texte) => texte.length > 0).join(' · ');
}

/** `details` d'une ligne admin : texte tel quel, ou objet {variante, supplements} rendu lisible. */
export function texteDetailsLigne(details: unknown): string {
  if (typeof details === 'string') return details.trim();
  if (details && typeof details === 'object') {
    const objet = details as Record<string, unknown>;
    return texteFormatEtOptions(objet['variante'], objet['supplements']);
  }
  return '';
}

/** Note spéciale portée par `details` (objet) d'une ligne admin, sinon chaîne vide. */
export function noteDetailsLigne(details: unknown): string {
  if (details && typeof details === 'object') {
    const note = (details as Record<string, unknown>)['note_speciale'];
    return typeof note === 'string' ? note.trim() : '';
  }
  return '';
}

/** Âge d'une commande : "à l'instant", "il y a 12 min", "il y a 3 h", "il y a 2 j". */
export function formaterAge(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${Math.floor(minutes)} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return `il y a ${Math.floor(heures / 24)} j`;
}

/** Durée moyenne en minutes : "12 min", "1 h 05", ou "—" si inconnue. */
export function formaterDuree(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const heures = Math.floor(total / 60);
  return `${heures} h ${String(total % 60).padStart(2, '0')}`;
}

/** À traiter : orange au-delà de 15 min, rouge au-delà de 30 min (les autres groupes restent neutres). */
export function classeAge(commande: Pick<CommandeAdmin, 'groupe' | 'age_minutes'>): string {
  if (commande.groupe !== 'a_traiter') return '';
  if (commande.age_minutes > 30) return 'age-rouge';
  if (commande.age_minutes > 15) return 'age-orange';
  return '';
}

/** Date et heure courtes, ex. "25/09/2026 14:57". */
export function formaterDateHeure(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Lien WhatsApp (https://wa.me/<numéro sans + ni espaces>) ; null si le numéro est vide. */
export function lienWhatsApp(telephone: string | null | undefined): string | null {
  const chiffres = (telephone ?? '').replace(/\D/g, '');
  return chiffres ? `https://wa.me/${chiffres}` : null;
}

/** Lien tel: (espaces retirés) ; null si le numéro est vide. */
export function lienTel(telephone: string | null | undefined): string | null {
  const numero = (telephone ?? '').replace(/\s/g, '');
  return numero ? `tel:${numero}` : null;
}

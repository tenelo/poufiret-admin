import { HttpErrorResponse } from '@angular/common/http';

export interface ErreursFormulaire {
  /** Message par nom de champ (premier message DRF). */
  champs: Record<string, string>;
  /** Message non rattachable à un champ (non_field_errors, message global). */
  general: string | null;
}

/** Premier message texte d'une valeur d'erreur DRF : "msg", ["msg"] ou {cle: ["msg"]}. */
function premierMessage(valeur: unknown): string | null {
  if (typeof valeur === 'string') {
    return valeur || null;
  }
  if (Array.isArray(valeur)) {
    for (const element of valeur) {
      const message = premierMessage(element);
      if (message) return message;
    }
    return null;
  }
  if (valeur && typeof valeur === 'object') {
    for (const element of Object.values(valeur)) {
      const message = premierMessage(element);
      if (message) return message;
    }
  }
  return null;
}

/**
 * 400 de validation DRF ({champ: ["msg"], ...}, éventuellement sous `details`, ou
 * {erreur, message}) → messages par champ. null si ce n'est pas un 400 exploitable.
 */
export function extraireErreursFormulaire(erreur: unknown): ErreursFormulaire | null {
  if (!(erreur instanceof HttpErrorResponse) || erreur.status !== 400) {
    return null;
  }
  const corps = erreur.error;
  const source = corps?.details && typeof corps.details === 'object' ? corps.details : corps;
  if (!source || typeof source !== 'object') {
    return null;
  }

  const champs: Record<string, string> = {};
  let general: string | null = null;
  for (const [cle, valeur] of Object.entries(source)) {
    const message = premierMessage(valeur);
    if (!message) continue;
    if (cle === 'non_field_errors' || cle === 'detail' || cle === 'message') {
      general ??= message;
    } else if (cle !== 'erreur' && cle !== 'code') {
      champs[cle] = message;
    }
  }
  return Object.keys(champs).length > 0 || general ? { champs, general } : null;
}

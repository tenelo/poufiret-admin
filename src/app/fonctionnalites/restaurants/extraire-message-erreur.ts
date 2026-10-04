import { HttpErrorResponse } from '@angular/common/http';

/** Extrait un message affichable d'une erreur HTTP, au format d'erreur du backend Poufiret. */
export function extraireMessageErreur(erreur: unknown): string {
  if (erreur instanceof HttpErrorResponse) {
    if (erreur.status === 0) {
      return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
    }
    const corps = erreur.error;
    if (typeof corps === 'string' && !/^\s*<(!doctype|html)/i.test(corps)) {
      return corps;
    }
    if (typeof corps?.message === 'string') {
      return corps.message;
    }
    if (typeof corps?.details?.detail === 'string') {
      return corps.details.detail;
    }
    if (typeof corps?.detail === 'string') {
      return corps.detail;
    }
    if (corps?.non_field_errors?.length) {
      return corps.non_field_errors[0];
    }
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/** Premier message DRF ({champ: ["msg"]} ou {champ: "msg"}) pour un champ donné, sinon null. */
export function erreurChamp(erreur: unknown, champ: string): string | null {
  if (!(erreur instanceof HttpErrorResponse) || erreur.status !== 400) {
    return null;
  }
  const corps = erreur.error;
  const source = corps?.details && typeof corps.details === 'object' ? corps.details : corps;
  const valeur = source?.[champ];
  if (typeof valeur === 'string') return valeur;
  if (Array.isArray(valeur) && typeof valeur[0] === 'string') return valeur[0];
  return null;
}

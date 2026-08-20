import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrait un message affichable d'une erreur HTTP (format backend Poufiret :
 * {erreur, message} ou {detail}). Copie locale au module livraison
 * (isolation — pas d'import depuis fonctionnalites/administration).
 */
export function extraireMessageErreurLivraison(erreur: unknown): string {
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

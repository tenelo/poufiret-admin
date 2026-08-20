import { HttpErrorResponse } from '@angular/common/http';

/** Extrait un message affichable d'une erreur HTTP, au format d'erreur du backend Poufiret. */
export function extraireMessageErreur(erreur: unknown): string {
  if (erreur instanceof HttpErrorResponse) {
    if (erreur.status === 0) {
      return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
    }
    const corps = erreur.error;
    // Une page d'erreur HTML (ex. 500 Django hors mode debug) n'est pas un
    // message affichable : on retombe sur le message générique dans ce cas.
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
  return "Une erreur est survenue. Veuillez réessayer.";
}

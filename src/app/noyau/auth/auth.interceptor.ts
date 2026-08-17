import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Subject, catchError, switchMap, take, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ConfigurationService } from '../config/configuration.service';

// Routes d'authentification publiques : ne doivent jamais recevoir le Authorization
// et ne doivent jamais déclencher de tentative de rafraîchissement en cas d'échec.
const CHEMINS_PUBLICS = ['/auth/connexion/', '/auth/rafraichir/'];

// État partagé entre toutes les requêtes concurrentes, pour ne déclencher qu'un
// seul rafraîchissement de jeton à la fois (équivalent du QueuedInterceptor Dio).
let rafraichissementEnCours = false;
const rafraichissementTermine$ = new Subject<string>();

/**
 * Intercepteur HTTP :
 * - ajoute le header Authorization: Bearer <access> sur les requêtes vers l'API,
 * - en cas de 401, tente un rafraîchissement du jeton puis rejoue la requête,
 * - si le rafraîchissement échoue, déconnecte l'utilisateur et redirige vers /connexion.
 */
export const authInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const authService = inject(AuthService);
  const configuration = inject(ConfigurationService);

  const estRequeteApi = requete.url.startsWith(configuration.apiUrl);
  const estRoutePublique = CHEMINS_PUBLICS.some((chemin) => requete.url.includes(chemin));

  if (!estRequeteApi || estRoutePublique) {
    return suivant(requete);
  }

  const jeton = authService.jetonAcces;
  const requeteAvecJeton = jeton
    ? requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } })
    : requete;

  return suivant(requeteAvecJeton).pipe(
    catchError((erreur: unknown) => {
      if (erreur instanceof HttpErrorResponse && erreur.status === 401) {
        return gererErreur401(requete, suivant, authService);
      }
      return throwError(() => erreur);
    }),
  );
};

function gererErreur401(
  requeteOriginale: Parameters<HttpInterceptorFn>[0],
  suivant: Parameters<HttpInterceptorFn>[1],
  authService: AuthService,
) {
  // Pas de session à rafraîchir : on laisse simplement l'erreur remonter.
  if (!authService.jetonRafraichissement) {
    authService.deconnexion();
    return throwError(() => new Error('Session expirée.'));
  }

  if (!rafraichissementEnCours) {
    rafraichissementEnCours = true;

    return authService.rafraichirJeton().pipe(
      switchMap((nouveauJeton) => {
        rafraichissementEnCours = false;
        rafraichissementTermine$.next(nouveauJeton);
        return suivant(
          requeteOriginale.clone({ setHeaders: { Authorization: `Bearer ${nouveauJeton}` } }),
        );
      }),
      catchError((erreur: unknown) => {
        rafraichissementEnCours = false;
        authService.deconnexion();
        return throwError(() => erreur);
      }),
    );
  }

  // Un rafraîchissement est déjà en cours : on attend son résultat puis on rejoue.
  return rafraichissementTermine$.pipe(
    take(1),
    switchMap((nouveauJeton) =>
      suivant(
        requeteOriginale.clone({ setHeaders: { Authorization: `Bearer ${nouveauJeton}` } }),
      ),
    ),
  );
}

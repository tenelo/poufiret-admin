import { InjectionToken, Injectable, computed, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { fromEvent, interval, merge, startWith } from 'rxjs';
import { filter } from 'rxjs/operators';

const INTERVALLE_VERIFICATION_MS = 5 * 60 * 1000;

/**
 * Rechargement de la page, derrière un jeton injectable : `Location.prototype.reload` n'est pas
 * substituable par `spyOn` dans les tests (propriété non réinscriptible), donc jamais appelé en
 * dur — ce jeton se remplace facilement par un espion dans les specs.
 */
export const RECHARGER_PAGE = new InjectionToken<() => void>('RECHARGER_PAGE', {
  providedIn: 'root',
  factory: () => () => document.location.reload(),
});

/**
 * Détecte les nouvelles versions déployées via le service worker Angular (ngsw-worker.js) et
 * pilote le bandeau « Une nouvelle version est disponible » (voir BandeauNouvelleVersion),
 * visible sur toutes les pages. Ne fait rien si le service worker n'est pas actif (mode
 * développement : `provideServiceWorker` désactivé par `isDevMode()` dans app.config.ts).
 *
 * Vérifie une nouvelle version au démarrage, toutes les 5 minutes, et à chaque retour sur
 * l'onglet (visibilitychange) — ce même contrôle fait réapparaître le bandeau si l'utilisateur
 * l'avait fermé par la croix, tant que la mise à jour détectée n'a pas été activée.
 */
@Injectable({ providedIn: 'root' })
export class MiseAJourService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly rechargerPage = inject(RECHARGER_PAGE);

  /** Vrai dès qu'une version est prête (VERSION_READY) ; ne redevient jamais faux tout seul. */
  private readonly versionPrete = signal(false);
  /** Fermé par la croix : masque le bandeau jusqu'au prochain contrôle (voir le constructeur). */
  private readonly masqueParUtilisateur = signal(false);

  /** Affiche le bandeau « Une nouvelle version est disponible ». */
  readonly miseAJourDisponible = computed(() => this.versionPrete() && !this.masqueParUtilisateur());

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((evenement): evenement is VersionReadyEvent => evenement.type === 'VERSION_READY'))
      .subscribe(() => this.versionPrete.set(true));

    // Rien de visible sur VERSION_INSTALLATION_FAILED (pas d'abonnement dédié : ignoré).

    // État irrécupérable : aucun bandeau utile, on recharge directement la page.
    this.swUpdate.unrecoverable.subscribe(() => this.rechargerPage());

    merge(
      interval(INTERVALLE_VERIFICATION_MS),
      fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden)),
    )
      .pipe(startWith(0))
      .subscribe(() => {
        // Un contrôle fait réapparaître le bandeau précédemment fermé par la croix.
        this.masqueParUtilisateur.set(false);
        void this.swUpdate.checkForUpdate();
      });
  }

  /** Active la version téléchargée puis recharge la page. */
  activer(): void {
    void this.swUpdate.activateUpdate().then(() => this.rechargerPage());
  }

  /** Ferme le bandeau sans rien activer : ne bloque jamais le travail en cours. */
  ignorer(): void {
    this.masqueParUtilisateur.set(true);
  }
}

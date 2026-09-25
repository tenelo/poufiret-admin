import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, filter, fromEvent, interval, merge, of, startWith, switchMap } from 'rxjs';

/**
 * Configuration d'un DetecteurCompteur : n'importe quel endpoint de résumé
 * exposant un compteur numérique peut être surveillé, il suffit de fournir
 * `charger` (l'appel réseau) et `selectionnerCompteur` (le champ à observer
 * dans la réponse). Rien ici n'est spécifique aux commandes — l'espace
 * livraison pourra réutiliser ce même service pour les courses entrantes en
 * changeant simplement ces deux fonctions.
 */
export interface OptionsDetecteurCompteur<T> {
  /** Appel réseau, rejoué à chaque tick de polling. */
  charger: () => Observable<T>;
  /** Extrait le compteur à surveiller de la réponse chargée. */
  selectionnerCompteur: (donnees: T) => number;
  /** Intervalle de polling, en millisecondes. */
  intervalleMs: number;
  /** Si fourni et retourne false, le tick est ignoré (ex. rôle non concerné). */
  actif?: () => boolean;
  /**
   * Si true, le polling est suspendu tant que l'onglet du navigateur est masqué et reprend
   * immédiatement à son retour (visibilitychange). Faux par défaut.
   */
  pauseSiOngletMasque?: boolean;
}

/**
 * Moteur générique de détection "le compteur surveillé a augmenté" par
 * polling. Ne pas injecter en `providedIn: 'root'` : à fournir via
 * `providers: [DetecteurCompteur]` sur le composant consommateur, pour que
 * chaque usage (cloche commandes, futur cloche courses livraison...) ait son
 * propre état de polling indépendant.
 */
@Injectable()
export class DetecteurCompteur<T = unknown> {
  private readonly destroyRef = inject(DestroyRef);

  private readonly compteurActuel = signal(0);
  private readonly derniereReponseInterne = signal<T | null>(null);
  private readonly augmentationDetecteeInterne = signal(false);
  private compteurPrecedent: number | null = null;
  private demarre = false;

  /** Valeur actuelle du compteur surveillé. */
  readonly compteur = this.compteurActuel.asReadonly();
  /** Dernière réponse complète chargée (pour afficher d'autres champs, ex. un mini résumé). */
  readonly derniereReponse = this.derniereReponseInterne.asReadonly();
  /** True juste après une augmentation détectée — à acquitter via `accuserAugmentation()`. */
  readonly aAugmente = this.augmentationDetecteeInterne.asReadonly();

  /** Démarre le polling. Sans effet si déjà démarré (un seul flux par instance). */
  demarrer(options: OptionsDetecteurCompteur<T>): void {
    if (this.demarre) {
      return;
    }
    this.demarre = true;

    const ticks$ = options.pauseSiOngletMasque
      ? merge(
          interval(options.intervalleMs),
          fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden)),
        )
      : interval(options.intervalleMs);

    ticks$
      .pipe(
        startWith(0),
        switchMap(() => {
          if (options.actif && !options.actif()) {
            return of(null);
          }
          if (options.pauseSiOngletMasque && document.hidden) {
            return of(null);
          }
          return options.charger().pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((donnees) => {
        if (donnees === null) {
          return;
        }
        this.derniereReponseInterne.set(donnees);
        const valeur = options.selectionnerCompteur(donnees);
        this.compteurActuel.set(valeur);
        // Ne jamais signaler d'augmentation sur le tout premier chargement
        // (compteurPrecedent encore null) — seulement sur une hausse réelle ensuite.
        if (this.compteurPrecedent !== null && valeur > this.compteurPrecedent) {
          this.augmentationDetecteeInterne.set(true);
        }
        this.compteurPrecedent = valeur;
      });
  }

  /**
   * Fixe le compteur sans signaler d'augmentation (ex. après avoir marqué des notifications
   * comme lues, ou quand une autre réponse donne déjà le compteur à jour).
   */
  definirCompteur(valeur: number): void {
    this.compteurActuel.set(valeur);
    this.compteurPrecedent = valeur;
  }

  /** À appeler une fois l'effet (son/animation) déclenché, pour ne pas le rejouer. */
  accuserAugmentation(): void {
    this.augmentationDetecteeInterne.set(false);
  }
}

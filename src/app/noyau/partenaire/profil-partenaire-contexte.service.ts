import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, shareReplay, tap } from 'rxjs';

import { ProfilPartenaireService } from '../../fonctionnalites/partenaire/mon-profil/profil-partenaire.service';
import { ProfilPartenaire } from '../../modeles/profil-partenaire.model';

/**
 * Cache, pour la session, le `type_partenaire` (et le reste du profil) du partenaire connecté —
 * notamment pour piloter le menu latéral (ex. « Ma carte »/« Mes menus » pour un restaurateur à la
 * place de « Mes produits »/« Mes catégories »), sans rappeler l'API à chaque navigation.
 * Pendant du `PermissionsService` côté admin.
 */
@Injectable({ providedIn: 'root' })
export class ProfilPartenaireContexteService {
  private readonly service = inject(ProfilPartenaireService);

  private readonly profilInterne = signal<ProfilPartenaire | null>(null);
  private requeteEnCours$: Observable<ProfilPartenaire> | null = null;

  readonly profil = this.profilInterne.asReadonly();
  readonly estRestaurateur = computed(() => this.profilInterne()?.type_partenaire === 'restaurateur');
  readonly estLoueur = computed(() => this.profilInterne()?.type_partenaire === 'loueur_maison');
  readonly estLoueurVoiture = computed(() => this.profilInterne()?.type_partenaire === 'loueur_voiture');
  readonly estHotelier = computed(() => this.profilInterne()?.type_partenaire === 'hotelier');

  /** Renvoie le profil en cache, ou déclenche l'appel réseau si pas encore chargé. */
  charger(): Observable<ProfilPartenaire> {
    const enCache = this.profilInterne();
    if (enCache) {
      return of(enCache);
    }
    if (!this.requeteEnCours$) {
      this.requeteEnCours$ = this.service.chargerProfil().pipe(
        tap((profil) => {
          this.profilInterne.set(profil);
          this.requeteEnCours$ = null;
        }),
        shareReplay(1),
      );
    }
    return this.requeteEnCours$;
  }

  /** Vide le cache (à appeler à la déconnexion). */
  reinitialiser(): void {
    this.profilInterne.set(null);
  }
}

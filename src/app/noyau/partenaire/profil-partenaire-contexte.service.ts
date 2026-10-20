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
const TYPES_RESTAURATION = ['restaurateur', 'fast_food'];
const TYPES_ETABLISSEMENT = ['boulanger', 'pharmacien', 'boutique_mode', 'libraire'];

@Injectable({ providedIn: 'root' })
export class ProfilPartenaireContexteService {
  private readonly service = inject(ProfilPartenaireService);

  private readonly profilInterne = signal<ProfilPartenaire | null>(null);
  private requeteEnCours$: Observable<ProfilPartenaire> | null = null;

  readonly profil = this.profilInterne.asReadonly();
  /** Restauration (restaurateur, fast-food) : espace établissement avec carte et menus. */
  readonly estRestaurateur = computed(() =>
    TYPES_RESTAURATION.includes(this.profilInterne()?.type_partenaire ?? ''),
  );
  /** Autres gabarits de l'espace établissement (boulangerie, pharmacie, mode, librairie). */
  readonly estEtablissement = computed(() =>
    TYPES_ETABLISSEMENT.includes(this.profilInterne()?.type_partenaire ?? ''),
  );
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

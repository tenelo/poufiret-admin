import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay, tap } from 'rxjs';

import { ConfigurationService } from '../config/configuration.service';
import { PermissionsAdmin, ReponsePermissionsAdmin } from '../../modeles/permissions-admin.model';

/**
 * Charge et met en cache les permissions fines de l'admin connecté
 * (GET /administration/mes-permissions/), pour piloter la visibilité du menu
 * admin et les gardes de route sans rappeler l'API à chaque navigation.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private readonly permissions = signal<PermissionsAdmin | null>(null);
  private requeteEnCours$: Observable<PermissionsAdmin> | null = null;

  /** Permissions actuellement en cache, ou null tant qu'elles n'ont pas été chargées. */
  readonly permissionsActuelles = this.permissions.asReadonly();

  /** True dès que les permissions ont été chargées au moins une fois. */
  readonly chargementTermine = computed(() => this.permissions() !== null);

  /**
   * Renvoie les permissions en cache, ou déclenche l'appel réseau si elles ne
   * sont pas encore chargées (une seule requête en vol même en cas d'appels
   * concurrents, grâce à shareReplay).
   */
  chargerPermissions(): Observable<PermissionsAdmin> {
    const enCache = this.permissions();
    if (enCache) {
      return of(enCache);
    }

    if (!this.requeteEnCours$) {
      this.requeteEnCours$ = this.http
        .get<ReponsePermissionsAdmin>(`${this.configuration.apiUrl}/administration/mes-permissions/`)
        .pipe(
          map((reponse) => this.versModele(reponse)),
          tap((permissions) => {
            this.permissions.set(permissions);
            this.requeteEnCours$ = null;
          }),
          shareReplay(1),
        );
    }
    return this.requeteEnCours$;
  }

  /** Lecture synchrone depuis le cache : false si pas encore chargées ou capacité absente/refusée. */
  aLaCapacite(nom: string): boolean {
    return this.permissions()?.capacites[nom] ?? false;
  }

  /** Vide le cache (à appeler à la déconnexion). */
  reinitialiser(): void {
    this.permissions.set(null);
    this.requeteEnCours$ = null;
  }

  private versModele(reponse: ReponsePermissionsAdmin): PermissionsAdmin {
    return {
      role: reponse.role,
      isStaff: reponse.is_staff,
      isSuperuser: reponse.is_superuser,
      capacites: reponse.capacites,
    };
  }
}

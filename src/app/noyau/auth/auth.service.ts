import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap, throwError } from 'rxjs';

import { ConfigurationService } from '../config/configuration.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  ReponseConnexion,
  ReponseRafraichissement,
  RequeteConnexion,
} from '../../modeles/auth.model';
import { RoleUtilisateur, Utilisateur } from '../../modeles/utilisateur.model';

// Clés utilisées pour la persistance dans localStorage.
const CLE_JETON_ACCES = 'poufiret_admin_access';
const CLE_JETON_RAFRAICHISSEMENT = 'poufiret_admin_refresh';
const CLE_UTILISATEUR = 'poufiret_admin_utilisateur';

/**
 * Service d'authentification : connexion, déconnexion, rafraîchissement du jeton
 * et exposition de l'utilisateur courant (et de son rôle) au reste de l'application.
 *
 * Les jetons sont pour l'instant stockés dans localStorage. Cela sera renforcé
 * plus tard (ex. cookies httpOnly côté backend) si nécessaire.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);
  private readonly router = inject(Router);
  private readonly permissionsService = inject(PermissionsService);

  private readonly utilisateurCourant = signal<Utilisateur | null>(this.lireUtilisateurStocke());

  /** Utilisateur actuellement connecté, ou null. */
  readonly utilisateur = this.utilisateurCourant.asReadonly();

  /** True si un utilisateur est connecté. */
  readonly estConnecte = computed(() => this.utilisateurCourant() !== null);

  /** Rôle de l'utilisateur connecté ('client' | 'partenaire' | 'admin'), ou null. */
  readonly role = computed<RoleUtilisateur | null>(() => this.utilisateurCourant()?.role ?? null);

  /** Jeton d'accès courant (lu directement depuis le stockage). */
  get jetonAcces(): string | null {
    return localStorage.getItem(CLE_JETON_ACCES);
  }

  /** Jeton de rafraîchissement courant (lu directement depuis le stockage). */
  get jetonRafraichissement(): string | null {
    return localStorage.getItem(CLE_JETON_RAFRAICHISSEMENT);
  }

  /**
   * Authentifie l'utilisateur via POST /auth/connexion/ avec {telephone, password}
   * (le "password" est le PIN à 4 chiffres). Enregistre la session en cas de succès.
   */
  connexion(telephone: string, pin: string): Observable<Utilisateur> {
    const requete: RequeteConnexion = { telephone, password: pin };
    return this.http
      .post<ReponseConnexion>(`${this.configuration.apiUrl}/auth/connexion/`, requete)
      .pipe(
        tap((reponse) => this.enregistrerSession(reponse)),
        map((reponse) => reponse.utilisateur),
      );
  }

  /** Efface la session locale et redirige vers la page de connexion. */
  deconnexion(): void {
    this.effacerSession();
    this.router.navigate(['/connexion']);
  }

  /**
   * Demande un nouveau jeton d'accès via POST /auth/rafraichir/.
   * Met à jour le jeton d'accès (et le jeton de rafraîchissement s'il est renvoyé).
   */
  rafraichirJeton(): Observable<string> {
    const refresh = this.jetonRafraichissement;
    if (!refresh) {
      return throwError(() => new Error('Aucun jeton de rafraîchissement disponible.'));
    }

    return this.http
      .post<ReponseRafraichissement>(`${this.configuration.apiUrl}/auth/rafraichir/`, { refresh })
      .pipe(
        tap((reponse) => {
          localStorage.setItem(CLE_JETON_ACCES, reponse.access);
          if (reponse.refresh) {
            localStorage.setItem(CLE_JETON_RAFRAICHISSEMENT, reponse.refresh);
          }
        }),
        map((reponse) => reponse.access),
      );
  }

  private enregistrerSession(reponse: ReponseConnexion): void {
    localStorage.setItem(CLE_JETON_ACCES, reponse.access);
    localStorage.setItem(CLE_JETON_RAFRAICHISSEMENT, reponse.refresh);
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(reponse.utilisateur));
    this.utilisateurCourant.set(reponse.utilisateur);
  }

  private effacerSession(): void {
    localStorage.removeItem(CLE_JETON_ACCES);
    localStorage.removeItem(CLE_JETON_RAFRAICHISSEMENT);
    localStorage.removeItem(CLE_UTILISATEUR);
    this.utilisateurCourant.set(null);
    this.permissionsService.reinitialiser();
  }

  private lireUtilisateurStocke(): Utilisateur | null {
    const brut = localStorage.getItem(CLE_UTILISATEUR);
    return brut ? (JSON.parse(brut) as Utilisateur) : null;
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../noyau/auth/auth.service';
import { ProfilPartenaireService } from '../partenaire/mon-profil/profil-partenaire.service';
import { ProfilPartenaire } from '../../modeles/profil-partenaire.model';

/**
 * Page d'accueil après connexion. Pour un partenaire, affiche un résumé de sa
 * vitrine (visites, statut, plan). Pour un admin, du contenu sera ajouté
 * module par module (pas encore d'endpoint de statistiques globales).
 */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [RouterLink],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.scss',
})
export class TableauDeBord implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profilPartenaireService = inject(ProfilPartenaireService);

  readonly utilisateur = this.authService.utilisateur;
  readonly role = this.authService.role;

  readonly chargementEnCours = signal(false);
  readonly erreurChargement = signal<string | null>(null);
  readonly profil = signal<ProfilPartenaire | null>(null);

  ngOnInit(): void {
    if (this.role() === 'partenaire') {
      this.chargerProfil();
    }
  }

  chargerProfil(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.profilPartenaireService.chargerProfil().subscribe({
      next: (profil) => {
        this.chargementEnCours.set(false);
        this.profil.set(profil);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  private extraireMessageErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      if (erreur.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
      }
      const corps = erreur.error;
      if (typeof corps === 'string') {
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
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  }
}

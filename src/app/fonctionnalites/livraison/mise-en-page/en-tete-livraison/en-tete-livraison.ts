import { Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../../noyau/auth/auth.service';
import { LIBELLES_NIVEAU, niveauDepuisEspace } from '../../niveau-livraison';

/**
 * En-tête de l'espace TeneLivr — propre au module livraison (ne réutilise
 * pas l'en-tête admin, pour rester extractible).
 */
@Component({
  selector: 'app-en-tete-livraison',
  imports: [],
  templateUrl: './en-tete-livraison.html',
  styleUrl: './en-tete-livraison.scss',
})
export class EnTeteLivraison {
  private readonly authService = inject(AuthService);

  readonly utilisateur = this.authService.utilisateur;

  readonly libelleNiveau = computed(() => {
    const niveau = niveauDepuisEspace(this.utilisateur()?.espace);
    return niveau ? LIBELLES_NIVEAU[niveau] : '';
  });

  readonly nomBureau = computed(
    () => this.utilisateur()?.livraisonNomBureau || this.utilisateur()?.livraisonDepartementNom || '',
  );

  deconnexion(): void {
    this.authService.deconnexion();
  }
}

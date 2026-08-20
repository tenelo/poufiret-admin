import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EnTeteLivraison } from '../en-tete-livraison/en-tete-livraison';
import { BarreLateraleLivraison } from '../barre-laterale-livraison/barre-laterale-livraison';
import { AuthService } from '../../../../noyau/auth/auth.service';

/**
 * Coquille de l'espace TeneLivr, affichée après connexion pour les niveaux
 * coordonnateur/superviseur/gestionnaire. Isolée du layout admin Poufiret
 * (en-tête et menu latéral propres au module), pour rester extractible vers
 * un futur projet TeneLivr autonome.
 */
@Component({
  selector: 'app-layout-livraison',
  imports: [RouterOutlet, EnTeteLivraison, BarreLateraleLivraison],
  templateUrl: './layout-livraison.html',
  styleUrl: './layout-livraison.scss',
})
export class LayoutLivraison implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Resynchronise l'espace/le bureau au chargement — best-effort, ne bloque
    // jamais l'affichage si l'appel échoue.
    this.authService.rafraichirUtilisateur().subscribe({ error: () => {} });
  }
}

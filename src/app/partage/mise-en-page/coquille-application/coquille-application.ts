import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EnTete } from '../en-tete/en-tete';
import { BarreLaterale } from '../barre-laterale/barre-laterale';
import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';

// Largeur à partir de laquelle la sidebar redevient fixe (doit rester alignée avec le SCSS).
const LARGEUR_BUREAU_PX = 992;

/**
 * Coquille applicative affichée après connexion : en-tête + menu latéral + contenu de la route active.
 * Déclenche le chargement (unique, mis en cache) des permissions fines pour
 * une session admin, avant que le menu/les routes admin en aient besoin.
 *
 * < 992px : le menu latéral devient un tiroir (drawer) ouvert par le bouton hamburger
 * de l'en-tête, refermé par le fond, la touche Échap ou un clic sur un lien.
 */
@Component({
  selector: 'app-coquille-application',
  imports: [RouterOutlet, EnTete, BarreLaterale],
  templateUrl: './coquille-application.html',
  styleUrl: './coquille-application.scss',
})
export class CoquilleApplication implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);

  readonly menuOuvert = signal(false);

  ngOnInit(): void {
    // Resynchronise l'espace/le rôle au chargement — best-effort, ne bloque
    // jamais l'affichage si l'appel échoue.
    this.authService.rafraichirUtilisateur().subscribe({ error: () => {} });

    if (this.authService.role() === 'admin') {
      this.permissionsService.chargerPermissions().subscribe();
    }
  }

  basculerMenu(): void {
    this.menuOuvert.update((ouvert) => !ouvert);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  /** Ferme le tiroir après un clic sur un lien de navigation de la barre latérale. */
  surClicBarreLaterale(evenement: Event): void {
    const cible = evenement.target as Element | null;
    if (cible?.closest('a')) {
      this.fermerMenu();
    }
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.fermerMenu();
  }

  // Évite qu'un tiroir resté ouvert réapparaisse en repassant en mode mobile.
  @HostListener('window:resize')
  surRedimensionnement(): void {
    if (window.innerWidth >= LARGEUR_BUREAU_PX) {
      this.fermerMenu();
    }
  }
}

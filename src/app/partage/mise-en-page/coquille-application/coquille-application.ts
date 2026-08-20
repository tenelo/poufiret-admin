import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EnTete } from '../en-tete/en-tete';
import { BarreLaterale } from '../barre-laterale/barre-laterale';
import { AuthService } from '../../../noyau/auth/auth.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';

/**
 * Coquille applicative affichée après connexion : en-tête + menu latéral + contenu de la route active.
 * Déclenche le chargement (unique, mis en cache) des permissions fines pour
 * une session admin, avant que le menu/les routes admin en aient besoin.
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

  ngOnInit(): void {
    // Resynchronise l'espace/le rôle au chargement — best-effort, ne bloque
    // jamais l'affichage si l'appel échoue.
    this.authService.rafraichirUtilisateur().subscribe({ error: () => {} });

    if (this.authService.role() === 'admin') {
      this.permissionsService.chargerPermissions().subscribe();
    }
  }
}

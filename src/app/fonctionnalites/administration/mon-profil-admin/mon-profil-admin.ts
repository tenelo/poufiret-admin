import { Component, OnInit, computed, inject } from '@angular/core';

import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { CarteMonCompte } from '../../../partage/mon-compte/carte-mon-compte/carte-mon-compte';
import { LIBELLES_CAPACITE, NomCapacite } from '../../../modeles/permissions-admin.model';

/**
 * Page "Mon profil" commune aux espaces admin et super-admin : identité du
 * compte + sécurité via la carte partagée CarteMonCompte (aussi utilisée côté
 * partenaire), et — pour un admin simple uniquement — consultation en lecture
 * seule de ses capacités (section "Mes droits").
 */
@Component({
  selector: 'app-mon-profil-admin',
  imports: [CarteMonCompte],
  templateUrl: './mon-profil-admin.html',
  styleUrl: './mon-profil-admin.scss',
})
export class MonProfilAdmin implements OnInit {
  private readonly permissionsService = inject(PermissionsService);

  private readonly permissions = this.permissionsService.permissionsActuelles;

  readonly libelleRole = computed(() => (this.permissions()?.isSuperuser ? 'Super-admin' : 'Admin'));

  /** Section "Mes droits" : admin simple uniquement, jamais le super-admin. */
  readonly afficherDroits = computed(() => {
    const p = this.permissions();
    return !!p && p.isStaff && !p.isSuperuser;
  });

  readonly entreesCapacites = computed(() => {
    const p = this.permissions();
    if (!p) {
      return [];
    }
    return Object.entries(p.capacites).map(([cle, valeur]) => ({
      cle,
      valeur,
      libelle: LIBELLES_CAPACITE[cle as NomCapacite] ?? cle.replace(/_/g, ' '),
    }));
  });

  ngOnInit(): void {
    this.permissionsService.chargerPermissions().subscribe({ error: () => {} });
  }
}

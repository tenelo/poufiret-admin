import { Component, input, output } from '@angular/core';

import {
  CapaciteDescriptor,
  GROUPES_CAPACITES,
  GroupeCapacites,
} from '../../../../modeles/gestion-admins.model';
import { NomCapacite } from '../../../../modeles/permissions-admin.model';

/**
 * Grille des 33 capacités groupées par section, avec toggles "Tout cocher /
 * Tout décocher" par groupe. Composant purement présentationnel : le parent
 * (création ou édition d'un admin) possède la valeur courante et applique
 * les événements émis. La capacité `gerer_admins` est verrouillée (lecture
 * seule) si l'utilisateur courant n'est pas super-admin — le backend
 * ignorerait silencieusement toute tentative de la modifier de toute façon.
 */
@Component({
  selector: 'app-selecteur-capacites',
  imports: [],
  templateUrl: './selecteur-capacites.html',
  styleUrl: './selecteur-capacites.scss',
})
export class SelecteurCapacites {
  readonly valeurs = input.required<Record<string, boolean>>();
  readonly estSuperAdmin = input(false);

  readonly bascule = output<NomCapacite>();
  readonly basculerGroupe = output<{ noms: NomCapacite[]; valeur: boolean }>();

  readonly groupes = GROUPES_CAPACITES;

  estActive(nom: NomCapacite): boolean {
    return this.valeurs()[nom] ?? false;
  }

  estVerrouillee(capacite: CapaciteDescriptor): boolean {
    return !!capacite.privilegiee && !this.estSuperAdmin();
  }

  toutCocher(groupe: GroupeCapacites): void {
    this.emettreGroupe(groupe, true);
  }

  toutDecocher(groupe: GroupeCapacites): void {
    this.emettreGroupe(groupe, false);
  }

  private emettreGroupe(groupe: GroupeCapacites, valeur: boolean): void {
    const noms = groupe.capacites.filter((c) => !this.estVerrouillee(c)).map((c) => c.nom);
    if (noms.length > 0) {
      this.basculerGroupe.emit({ noms, valeur });
    }
  }
}

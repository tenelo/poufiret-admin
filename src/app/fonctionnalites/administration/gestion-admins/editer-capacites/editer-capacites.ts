import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { SelecteurCapacites } from '../selecteur-capacites/selecteur-capacites';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';
import { AdminGere } from '../../../../modeles/gestion-admins.model';
import { NomCapacite } from '../../../../modeles/permissions-admin.model';

/**
 * Éditeur des capacités d'un admin, affiché en overlay par le composant
 * parent (gestion-admins). Émet uniquement les capacités modifiées (diff par
 * rapport à `admin().capacites`) — le parent fait le PATCH et gère succès/erreur.
 */
@Component({
  selector: 'app-editer-capacites',
  imports: [SelecteurCapacites],
  templateUrl: './editer-capacites.html',
  styleUrl: './editer-capacites.scss',
})
export class EditerCapacites {
  private readonly permissionsService = inject(PermissionsService);

  readonly admin = input.required<AdminGere>();
  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly ferme = output<void>();
  readonly enregistre = output<Partial<Record<NomCapacite, boolean>>>();

  readonly estSuperAdmin = computed(
    () => this.permissionsService.permissionsActuelles()?.isSuperuser ?? false,
  );

  readonly valeursCourantes = signal<Record<string, boolean>>({});

  readonly aDesModifications = computed(() => {
    const original = this.admin().capacites;
    const courantes = this.valeursCourantes();
    return Object.entries(courantes).some(([nom, valeur]) => (original[nom] ?? false) !== valeur);
  });

  constructor() {
    effect(() => {
      this.valeursCourantes.set({ ...this.admin().capacites });
    });
  }

  basculerCapacite(nom: NomCapacite): void {
    this.valeursCourantes.update((valeurs) => ({ ...valeurs, [nom]: !valeurs[nom] }));
  }

  basculerGroupeCapacites(evenement: { noms: NomCapacite[]; valeur: boolean }): void {
    this.valeursCourantes.update((valeurs) => {
      const copie = { ...valeurs };
      for (const nom of evenement.noms) {
        copie[nom] = evenement.valeur;
      }
      return copie;
    });
  }

  enregistrer(): void {
    if (!this.aDesModifications() || this.enregistrementEnCours()) {
      return;
    }
    const original = this.admin().capacites;
    const courantes = this.valeursCourantes();
    const diff: Partial<Record<NomCapacite, boolean>> = {};
    for (const [nom, valeur] of Object.entries(courantes)) {
      if ((original[nom] ?? false) !== valeur) {
        diff[nom as NomCapacite] = valeur;
      }
    }
    this.enregistre.emit(diff);
  }
}

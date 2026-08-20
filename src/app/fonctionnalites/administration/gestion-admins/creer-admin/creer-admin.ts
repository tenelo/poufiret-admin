import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SelecteurCapacites } from '../selecteur-capacites/selecteur-capacites';
import { PermissionsService } from '../../../../noyau/permissions/permissions.service';
import { RequeteCreerAdmin } from '../../../../modeles/gestion-admins.model';
import { NomCapacite } from '../../../../modeles/permissions-admin.model';

/**
 * Formulaire de création d'un admin, affiché en overlay par le composant
 * parent (gestion-admins). Ne fait pas l'appel réseau lui-même : émet
 * `soumis` avec le payload construit, le parent gère l'appel et le panneau
 * de succès (affichage du PIN en clair).
 */
@Component({
  selector: 'app-creer-admin',
  imports: [ReactiveFormsModule, SelecteurCapacites],
  templateUrl: './creer-admin.html',
  styleUrl: './creer-admin.scss',
})
export class CreerAdmin {
  private readonly formBuilder = inject(FormBuilder);
  private readonly permissionsService = inject(PermissionsService);

  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly soumis = output<RequeteCreerAdmin>();
  readonly annule = output<void>();

  readonly estSuperAdmin = computed(
    () => this.permissionsService.permissionsActuelles()?.isSuperuser ?? false,
  );

  readonly capacitesInitiales = signal<Partial<Record<NomCapacite, boolean>>>({});

  readonly formulaire = this.formBuilder.nonNullable.group({
    telephone: ['', [Validators.required, Validators.pattern(/^\+[0-9]{6,15}$/)]],
    prenom: [''],
    nom: [''],
    username: [''],
  });

  basculerCapacite(nom: NomCapacite): void {
    this.capacitesInitiales.update((valeurs) => ({ ...valeurs, [nom]: !valeurs[nom] }));
  }

  basculerGroupeCapacites(evenement: { noms: NomCapacite[]; valeur: boolean }): void {
    this.capacitesInitiales.update((valeurs) => {
      const copie = { ...valeurs };
      for (const nom of evenement.noms) {
        copie[nom] = evenement.valeur;
      }
      return copie;
    });
  }

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const v = this.formulaire.getRawValue();
    const capacites = this.capacitesInitiales();
    const donnees: RequeteCreerAdmin = {
      telephone: v.telephone.trim(),
      prenom: this.videSiVide(v.prenom),
      nom: this.videSiVide(v.nom),
      username: this.videSiVide(v.username),
      capacites: Object.keys(capacites).length > 0 ? capacites : undefined,
    };
    this.soumis.emit(donnees);
  }

  private videSiVide(valeur: string): string | undefined {
    const texte = valeur.trim();
    return texte ? texte : undefined;
  }
}

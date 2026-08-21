import { Component, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Departement } from '../../../../modeles/departement.model';
import { LIBELLES_TYPE_COMPTE, TypeCompteEquipe } from '../../modeles/compte-equipe-livraison.model';
import { TypeVehicule } from '../../modeles/livreur-bureau.model';

export interface ValeursFormulaireCompteEquipe {
  telephone: string;
  prenom?: string;
  nom?: string;
  nom_bureau?: string;
  type_vehicule?: TypeVehicule;
  immatriculation?: string;
}

/**
 * Dialog de création générique pour un compte d'équipe TeneLivr (superviseur,
 * gestionnaire ou livreur) — les champs affichés varient selon `type`. Ne
 * fait pas l'appel réseau : émet `soumis`, le parent construit la requête
 * typée (avec ville_id forcé) et gère l'appel + le panneau de succès (PIN).
 */
@Component({
  selector: 'app-dialog-creation-compte',
  imports: [ReactiveFormsModule],
  templateUrl: './dialog-creation-compte.html',
  styleUrl: './dialog-creation-compte.scss',
})
export class DialogCreationCompte {
  private readonly formBuilder = inject(FormBuilder);

  readonly type = input.required<TypeCompteEquipe>();
  readonly ville = input.required<Departement>();
  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly soumis = output<ValeursFormulaireCompteEquipe>();
  readonly annule = output<void>();

  readonly titre = computed(() => `Ajouter un ${LIBELLES_TYPE_COMPTE[this.type()]}`);

  readonly formulaire = this.formBuilder.nonNullable.group({
    telephone: ['', [Validators.required, Validators.pattern(/^\+[0-9]{6,15}$/)]],
    prenom: [''],
    nom: [''],
    nom_bureau: [''],
    type_vehicule: ['moto' as TypeVehicule],
    immatriculation: [''],
  });

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const v = this.formulaire.getRawValue();
    const donnees: ValeursFormulaireCompteEquipe = {
      telephone: v.telephone.trim(),
      prenom: this.videSiVide(v.prenom),
      nom: this.videSiVide(v.nom),
    };
    if (this.type() === 'superviseur' || this.type() === 'gestionnaire') {
      donnees.nom_bureau = this.videSiVide(v.nom_bureau);
    } else {
      donnees.type_vehicule = v.type_vehicule;
      donnees.immatriculation = this.videSiVide(v.immatriculation);
    }
    this.soumis.emit(donnees);
  }

  private videSiVide(valeur: string): string | undefined {
    const texte = valeur.trim();
    return texte ? texte : undefined;
  }
}

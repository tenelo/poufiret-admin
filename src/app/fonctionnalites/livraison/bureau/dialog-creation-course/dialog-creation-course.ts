import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RequeteCreerCourse } from '../../modeles/course-livraison.model';

/**
 * Formulaire de création d'une course A→B. La ville est forcée côté serveur
 * (celle du bureau) — pas de champ ville ici. Ne fait pas l'appel réseau :
 * émet `soumis`, le parent gère l'appel et le message de résultat.
 */
@Component({
  selector: 'app-dialog-creation-course',
  imports: [ReactiveFormsModule],
  templateUrl: './dialog-creation-course.html',
  styleUrl: './dialog-creation-course.scss',
})
export class DialogCreationCourse {
  private readonly formBuilder = inject(FormBuilder);

  readonly enregistrementEnCours = input(false);
  readonly messageErreur = input<string | null>(null);

  readonly soumis = output<RequeteCreerCourse>();
  readonly annule = output<void>();

  readonly formulaire = this.formBuilder.nonNullable.group({
    a_quartier: ['', [Validators.required]],
    a_nom_contact: ['', [Validators.required]],
    a_telephone_contact: ['', [Validators.required]],
    a_latitude: [''],
    a_longitude: [''],
    b_quartier: ['', [Validators.required]],
    b_nom_contact: ['', [Validators.required]],
    b_telephone_contact: ['', [Validators.required]],
    b_latitude: [''],
    b_longitude: [''],
    description_colis: [''],
    prix: [''],
  });

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const v = this.formulaire.getRawValue();
    const donnees: RequeteCreerCourse = {
      a_quartier: v.a_quartier.trim(),
      a_nom_contact: v.a_nom_contact.trim(),
      a_telephone_contact: v.a_telephone_contact.trim(),
      b_quartier: v.b_quartier.trim(),
      b_nom_contact: v.b_nom_contact.trim(),
      b_telephone_contact: v.b_telephone_contact.trim(),
      a_latitude: this.versNombre(v.a_latitude),
      a_longitude: this.versNombre(v.a_longitude),
      b_latitude: this.versNombre(v.b_latitude),
      b_longitude: this.versNombre(v.b_longitude),
      description_colis: v.description_colis.trim() || undefined,
      prix: this.versNombre(v.prix),
    };
    this.soumis.emit(donnees);
  }

  private versNombre(valeur: string): number | undefined {
    const texte = valeur.trim();
    if (!texte) {
      return undefined;
    }
    const nombre = Number(texte);
    return Number.isFinite(nombre) ? nombre : undefined;
  }
}

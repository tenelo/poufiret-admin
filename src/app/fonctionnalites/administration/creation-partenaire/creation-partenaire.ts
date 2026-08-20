import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreationPartenaireService } from './creation-partenaire.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { Departement } from '../../../modeles/departement.model';
import {
  CategorieCatalogueAplatie,
  aplatirCategories,
} from '../../../modeles/categorie-catalogue.model';
import {
  OPTIONS_TYPE_PARTENAIRE_CREATION,
  ReponseCreationPartenaire,
  RequeteCreationPartenaire,
  TypePartenaireCreation,
} from '../../../modeles/creation-partenaire.model';

/**
 * Écran "Créer un partenaire" : formulaire admin de création complète d'un
 * partenaire (compte + profil actif) via POST /auth/partenaires/creer/.
 */
@Component({
  selector: 'app-creation-partenaire',
  imports: [ReactiveFormsModule],
  templateUrl: './creation-partenaire.html',
  styleUrl: './creation-partenaire.scss',
})
export class CreationPartenaire implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(CreationPartenaireService);

  readonly optionsTypePartenaire = OPTIONS_TYPE_PARTENAIRE_CREATION;

  readonly departements = signal<Departement[]>([]);
  readonly chargementDepartements = signal(true);
  readonly erreurDepartements = signal<string | null>(null);

  readonly categoriesAplaties = signal<CategorieCatalogueAplatie[]>([]);
  readonly chargementCategories = signal(true);
  readonly erreurCategories = signal<string | null>(null);
  readonly categoriesSelectionnees = signal<Set<number>>(new Set());

  readonly envoiEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly reponseSucces = signal<ReponseCreationPartenaire | null>(null);
  readonly pinCopie = signal(false);

  readonly formulaire = this.formBuilder.nonNullable.group({
    telephone: ['', [Validators.required, Validators.pattern(/^\+[0-9]{6,15}$/)]],
    prenom: [''],
    nom: [''],
    nom_commerce: ['', [Validators.required]],
    type_partenaire: [''],
    description: [''],
    departement: [''],
    adresse: [''],
    quartier: [''],
    secteur: [''],
    ville: [''],
    telephone_pro: [''],
    whatsapp: [''],
    email_pro: ['', [Validators.email]],
  });

  ngOnInit(): void {
    this.chargerDepartements();
    this.chargerCategories();
  }

  chargerDepartements(): void {
    this.chargementDepartements.set(true);
    this.erreurDepartements.set(null);

    this.service.listerDepartements().subscribe({
      next: (departements) => {
        this.chargementDepartements.set(false);
        this.departements.set(departements);
      },
      error: (erreur: unknown) => {
        this.chargementDepartements.set(false);
        this.erreurDepartements.set(extraireMessageErreur(erreur));
      },
    });
  }

  chargerCategories(): void {
    this.chargementCategories.set(true);
    this.erreurCategories.set(null);

    this.service.listerCategories().subscribe({
      next: (categories) => {
        this.chargementCategories.set(false);
        this.categoriesAplaties.set(aplatirCategories(categories));
      },
      error: (erreur: unknown) => {
        this.chargementCategories.set(false);
        this.erreurCategories.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerCategorie(id: number): void {
    this.categoriesSelectionnees.update((ensemble) => {
      const copie = new Set(ensemble);
      if (copie.has(id)) {
        copie.delete(id);
      } else {
        copie.add(id);
      }
      return copie;
    });
  }

  soumettre(): void {
    if (this.formulaire.invalid || this.envoiEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.envoiEnCours.set(true);
    this.messageErreur.set(null);

    this.service.creer(this.construirePayload()).subscribe({
      next: (reponse) => {
        this.envoiEnCours.set(false);
        this.reponseSucces.set(reponse);
      },
      error: (erreur: unknown) => {
        this.envoiEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  creerUnAutre(): void {
    this.reponseSucces.set(null);
    this.pinCopie.set(false);
    this.messageErreur.set(null);
    this.categoriesSelectionnees.set(new Set());
    this.formulaire.reset({
      telephone: '',
      prenom: '',
      nom: '',
      nom_commerce: '',
      type_partenaire: '',
      description: '',
      departement: '',
      adresse: '',
      quartier: '',
      secteur: '',
      ville: '',
      telephone_pro: '',
      whatsapp: '',
      email_pro: '',
    });
  }

  copierPin(): void {
    const pin = this.reponseSucces()?.pin_par_defaut;
    if (!pin) {
      return;
    }
    navigator.clipboard.writeText(pin).then(() => {
      this.pinCopie.set(true);
      setTimeout(() => this.pinCopie.set(false), 2000);
    });
  }

  private construirePayload(): RequeteCreationPartenaire {
    const v = this.formulaire.getRawValue();

    return {
      telephone: v.telephone.trim(),
      nom_commerce: v.nom_commerce.trim(),
      prenom: this.videSiVide(v.prenom),
      nom: this.videSiVide(v.nom),
      type_partenaire: v.type_partenaire ? (v.type_partenaire as TypePartenaireCreation) : undefined,
      description: this.videSiVide(v.description),
      adresse: this.videSiVide(v.adresse),
      quartier: this.videSiVide(v.quartier),
      secteur: this.videSiVide(v.secteur),
      ville: this.videSiVide(v.ville),
      departement: v.departement ? Number(v.departement) : undefined,
      telephone_pro: this.videSiVide(v.telephone_pro),
      whatsapp: this.videSiVide(v.whatsapp),
      email_pro: this.videSiVide(v.email_pro),
      categories: this.categoriesSelectionnees().size > 0 ? [...this.categoriesSelectionnees()] : undefined,
    };
  }

  private videSiVide(valeur: string): string | undefined {
    const texte = valeur.trim();
    return texte ? texte : undefined;
  }
}

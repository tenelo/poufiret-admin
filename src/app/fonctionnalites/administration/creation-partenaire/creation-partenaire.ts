import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreationPartenaireService } from './creation-partenaire.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { LocaliteQuartierService } from '../../../noyau/geo/localite-quartier.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { CoordonneesGps, PositionGps } from '../../../partage/position-gps/position-gps';
import { Departement } from '../../../modeles/departement.model';
import { OptionGeo } from '../../../modeles/geographie.model';
import {
  CategorieCatalogueAplatie,
  aplatirCategories,
} from '../../../modeles/categorie-catalogue.model';
import { CorrespondanceTypeCategorie } from '../../../modeles/correspondance-type-categorie.model';
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
  imports: [ReactiveFormsModule, RouterLink, PositionGps],
  templateUrl: './creation-partenaire.html',
  styleUrl: './creation-partenaire.scss',
})
export class CreationPartenaire implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(CreationPartenaireService);
  private readonly localiteQuartierService = inject(LocaliteQuartierService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly optionsTypePartenaire = OPTIONS_TYPE_PARTENAIRE_CREATION;

  readonly peutGererGeographie = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('gerer_geographie'),
  );

  readonly departements = signal<Departement[]>([]);
  readonly chargementDepartements = signal(true);
  readonly erreurDepartements = signal<string | null>(null);

  readonly localites = signal<OptionGeo[]>([]);
  readonly chargementLocalites = signal(false);
  readonly erreurLocalites = signal<string | null>(null);

  readonly quartiers = signal<OptionGeo[]>([]);
  readonly chargementQuartiers = signal(false);
  readonly erreurQuartiers = signal<string | null>(null);

  // Position GPS optionnelle, capturée localement puis envoyée avec le reste du
  // formulaire à la création (pas d'appel réseau indépendant : le partenaire n'existe pas encore).
  // Pas de réinitialisation explicite nécessaire : le composant est démonté puis remonté par le
  // @if/@else du template entre le panneau de succès et le formulaire (voir creerUnAutre()).
  readonly positionChoisie = signal<CoordonneesGps | null>(null);

  readonly categoriesAplaties = signal<CategorieCatalogueAplatie[]>([]);
  readonly chargementCategories = signal(true);
  readonly erreurCategories = signal<string | null>(null);
  readonly categoriesSelectionnees = signal<Set<number>>(new Set());

  // ---- Catégorie cochée automatiquement selon le type (voir OPTIONS_TYPE_PARTENAIRE_CREATION) ----
  readonly correspondances = signal<CorrespondanceTypeCategorie[]>([]);
  // Id de la catégorie actuellement auto-cochée pour le type en cours, tant qu'elle n'a pas été
  // touchée à la main — sert uniquement à savoir si un futur changement de type doit la décocher.
  private categorieAutoId: number | null = null;
  readonly avertissementCategorieDecochee = signal<string | null>(null);

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
    localite_id: [''],
    quartier_id: [''],
    secteur: [''],
    telephone_pro: [''],
    whatsapp: [''],
    email_pro: ['', [Validators.email]],
  });

  ngOnInit(): void {
    this.chargerDepartements();
    this.chargerCategories();
    this.chargerCorrespondances();

    this.formulaire.controls.type_partenaire.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valeur) => this.appliquerChangementType(valeur));

    this.formulaire.controls.departement.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valeur) => this.appliquerChangementDepartement(valeur));

    this.formulaire.controls.localite_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valeur) => this.appliquerChangementLocalite(valeur));
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

  /** Changer le département réinitialise localité et quartier, puis recharge les localités. */
  private appliquerChangementDepartement(valeur: string): void {
    this.formulaire.patchValue({ localite_id: '', quartier_id: '' }, { emitEvent: false });
    this.localites.set([]);
    this.quartiers.set([]);
    this.erreurLocalites.set(null);
    this.erreurQuartiers.set(null);
    if (valeur) {
      this.chargerLocalites(Number(valeur));
    }
  }

  /** Changer la localité réinitialise le quartier, puis recharge les quartiers. */
  private appliquerChangementLocalite(valeur: string): void {
    this.formulaire.patchValue({ quartier_id: '' }, { emitEvent: false });
    this.quartiers.set([]);
    this.erreurQuartiers.set(null);
    if (valeur) {
      this.chargerQuartiers(Number(valeur));
    }
  }

  chargerLocalitesPourDepartementActuel(): void {
    const departement = this.formulaire.controls.departement.value;
    if (departement) {
      this.chargerLocalites(Number(departement));
    }
  }

  chargerQuartiersPourLocaliteActuelle(): void {
    const localite = this.formulaire.controls.localite_id.value;
    if (localite) {
      this.chargerQuartiers(Number(localite));
    }
  }

  definirPosition(position: CoordonneesGps | null): void {
    this.positionChoisie.set(position);
  }

  private chargerLocalites(departementId: number): void {
    this.chargementLocalites.set(true);
    this.erreurLocalites.set(null);

    this.localiteQuartierService.listerLocalites(departementId).subscribe({
      next: (localites) => {
        this.chargementLocalites.set(false);
        this.localites.set(localites);
      },
      error: (erreur: unknown) => {
        this.chargementLocalites.set(false);
        this.erreurLocalites.set(extraireMessageErreur(erreur));
      },
    });
  }

  private chargerQuartiers(localiteId: number): void {
    this.chargementQuartiers.set(true);
    this.erreurQuartiers.set(null);

    this.localiteQuartierService.listerQuartiers(localiteId).subscribe({
      next: (quartiers) => {
        this.chargementQuartiers.set(false);
        this.quartiers.set(quartiers);
      },
      error: (erreur: unknown) => {
        this.chargementQuartiers.set(false);
        this.erreurQuartiers.set(extraireMessageErreur(erreur));
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
    const etaitCochee = this.categoriesSelectionnees().has(id);

    this.categoriesSelectionnees.update((ensemble) => {
      const copie = new Set(ensemble);
      if (copie.has(id)) {
        copie.delete(id);
      } else {
        copie.add(id);
      }
      return copie;
    });

    if (id === this.categorieAutoId) {
      // Touchée à la main : un futur changement de type ne la décochera plus silencieusement.
      this.categorieAutoId = null;
    }

    const correspondance = this.correspondancePourTypeActuel();
    if (correspondance?.categorie_id === id) {
      this.avertissementCategorieDecochee.set(
        etaitCochee
          ? `Ce partenaire n'apparaîtra pas dans le rayon « ${correspondance.categorie_nom} ». Le backend l'y ajoutera quand même à l'enregistrement.`
          : null,
      );
    }
  }

  /** Vrai si cette catégorie est celle que le type actuellement choisi ajoute automatiquement. */
  estCategoriePrincipale(id: number): boolean {
    return this.correspondancePourTypeActuel()?.categorie_id === id;
  }

  private correspondancePourTypeActuel(): CorrespondanceTypeCategorie | undefined {
    return this.correspondancePour(this.formulaire.controls.type_partenaire.value);
  }

  private correspondancePour(type: string): CorrespondanceTypeCategorie | undefined {
    return this.correspondances().find((c) => c.type_partenaire === type);
  }

  private chargerCorrespondances(): void {
    this.service.listerCorrespondancesTypes().subscribe({
      next: (correspondances) => {
        this.correspondances.set(correspondances);
        // Rattrape le cas où un type avait déjà été choisi avant que les correspondances arrivent.
        const typeActuel = this.formulaire.controls.type_partenaire.value;
        if (typeActuel && this.categorieAutoId === null) {
          this.appliquerChangementType(typeActuel);
        }
      },
      // Si l'endpoint échoue : le formulaire fonctionne comme avant, sans automatisme.
      error: () => undefined,
    });
  }

  /** Au choix ou au changement du type : décoche l'ancienne catégorie auto (si non touchée à la
   *  main), coche la nouvelle catégorie correspondante. Les autres catégories restent inchangées. */
  private appliquerChangementType(type: string): void {
    if (this.categorieAutoId !== null) {
      const ancienId = this.categorieAutoId;
      this.categoriesSelectionnees.update((ensemble) => {
        const copie = new Set(ensemble);
        copie.delete(ancienId);
        return copie;
      });
    }
    this.categorieAutoId = null;
    this.avertissementCategorieDecochee.set(null);

    const correspondance = this.correspondancePour(type);
    if (correspondance) {
      this.categoriesSelectionnees.update((ensemble) => new Set(ensemble).add(correspondance.categorie_id));
      this.categorieAutoId = correspondance.categorie_id;
    }
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
    this.categorieAutoId = null;
    this.avertissementCategorieDecochee.set(null);
    this.localites.set([]);
    this.quartiers.set([]);
    this.erreurLocalites.set(null);
    this.erreurQuartiers.set(null);
    this.positionChoisie.set(null);
    this.formulaire.reset({
      telephone: '',
      prenom: '',
      nom: '',
      nom_commerce: '',
      type_partenaire: '',
      description: '',
      departement: '',
      adresse: '',
      localite_id: '',
      quartier_id: '',
      secteur: '',
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
      secteur: this.videSiVide(v.secteur),
      departement: v.departement ? Number(v.departement) : undefined,
      localite_id: v.localite_id ? Number(v.localite_id) : undefined,
      quartier_id: v.quartier_id ? Number(v.quartier_id) : undefined,
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

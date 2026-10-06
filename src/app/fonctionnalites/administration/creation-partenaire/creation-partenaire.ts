import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreationPartenaireService } from './creation-partenaire.service';
import { extraireMessageErreur, erreurChamp } from '../tableau-de-bord-admin/extraire-message-erreur';
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
import {
  ReponseEditionPartenaire,
  RequeteEditionPartenaire,
} from '../../../modeles/edition-partenaire-admin.model';

// Taille max acceptée côté client pour le logo / la photo de couverture (mode édition).
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

const CHAMPS_CONNUS_EDITION = [
  'nom_commerce',
  'type_partenaire',
  'departement',
  'localite_id',
  'quartier_id',
  'secteur',
  'adresse',
  'telephone_pro',
  'whatsapp',
  'email_pro',
  'categories',
  'logo',
  'photo_couverture',
];

/**
 * Écran "Créer un partenaire" : formulaire admin de création complète d'un
 * partenaire (compte + profil actif) via POST /auth/partenaires/creer/. Réutilisé
 * en mode édition (si `partenaireId` est fourni) pour modifier un partenaire
 * existant via GET/PATCH /administration/partenaires/<id>/edition/ — même
 * composant, sans duplication (voir la fiche partenaire admin dans partenaires-liste).
 */
@Component({
  selector: 'app-creation-partenaire',
  imports: [ReactiveFormsModule, RouterLink, PositionGps],
  templateUrl: './creation-partenaire.html',
  styleUrl: './creation-partenaire.scss',
})
export class CreationPartenaire implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(CreationPartenaireService);
  private readonly localiteQuartierService = inject(LocaliteQuartierService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly destroyRef = inject(DestroyRef);

  /** Non null = mode édition d'un partenaire existant plutôt que création. */
  readonly partenaireId = input<number | null>(null);
  readonly modeEdition = computed(() => this.partenaireId() !== null);

  /** Émis en mode édition après un enregistrement réussi (le parent rafraîchit et ferme). */
  readonly enregistre = output<ReponseEditionPartenaire>();

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

  // ---- Mode édition ----
  readonly chargementEdition = signal(false);
  readonly erreurChargementEdition = signal<string | null>(null);
  readonly messageSuccesEdition = signal<string | null>(null);
  private readonly derniereErreurEdition = signal<unknown>(null);
  private donneesOriginalesEdition: ReponseEditionPartenaire | null = null;

  readonly erreurGeneraleEdition = computed(() => {
    const erreur = this.derniereErreurEdition();
    if (!erreur) {
      return null;
    }
    if (CHAMPS_CONNUS_EDITION.some((champ) => erreurChamp(erreur, champ))) {
      return null;
    }
    return extraireMessageErreur(erreur);
  });

  // Logo / photo de couverture (mode édition uniquement — pas de champ image à la création).
  readonly logoApercu = signal<string | null>(null);
  readonly logoFichier = signal<File | null>(null);
  readonly logoRetire = signal(false);
  readonly couvertureApercu = signal<string | null>(null);
  readonly couvertureFichier = signal<File | null>(null);
  readonly couvertureRetiree = signal(false);
  readonly erreurImageEdition = signal<string | null>(null);
  private apercuLogoLocal: string | null = null;
  private apercuCouvertureLocal: string | null = null;

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

    if (this.modeEdition()) {
      // Pas de numéro de connexion ni de position en édition (boutons dédiés sur la fiche) :
      // le contrôle téléphone reste dans le formGroup (typage inchangé) mais sans validation.
      this.formulaire.controls.telephone.clearValidators();
      this.formulaire.controls.telephone.updateValueAndValidity();
      this.chargerPourEdition(this.partenaireId()!);
    }

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

  ngOnDestroy(): void {
    if (this.apercuLogoLocal) {
      URL.revokeObjectURL(this.apercuLogoLocal);
    }
    if (this.apercuCouvertureLocal) {
      URL.revokeObjectURL(this.apercuCouvertureLocal);
    }
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

  // ---- Mode édition ----

  chargerPourEdition(id: number): void {
    this.chargementEdition.set(true);
    this.erreurChargementEdition.set(null);

    this.service.chargerPourEdition(id).subscribe({
      next: (donnees) => {
        this.chargementEdition.set(false);
        this.appliquerDonneesEdition(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEdition.set(false);
        this.erreurChargementEdition.set(extraireMessageErreur(erreur));
      },
    });
  }

  private appliquerDonneesEdition(donnees: ReponseEditionPartenaire): void {
    this.donneesOriginalesEdition = donnees;
    this.categoriesSelectionnees.set(new Set(donnees.categories.map((c) => c.id)));
    this.logoApercu.set(donnees.logo);
    this.couvertureApercu.set(donnees.photo_couverture);
    this.logoFichier.set(null);
    this.couvertureFichier.set(null);
    this.logoRetire.set(false);
    this.couvertureRetiree.set(false);

    this.formulaire.patchValue(
      {
        prenom: donnees.prenom,
        nom: donnees.nom,
        nom_commerce: donnees.nom_commerce,
        type_partenaire: donnees.type_partenaire,
        description: donnees.description,
        departement: donnees.departement !== null ? String(donnees.departement) : '',
        localite_id: donnees.localite_id !== null ? String(donnees.localite_id) : '',
        quartier_id: donnees.quartier_id !== null ? String(donnees.quartier_id) : '',
        secteur: donnees.secteur,
        adresse: donnees.adresse,
        telephone_pro: donnees.telephone_pro,
        whatsapp: donnees.whatsapp,
        email_pro: donnees.email_pro,
      },
      // emitEvent: false — évite que le patch de departement/localite_id ne déclenche leur
      // propre réinitialisation en cascade (voir appliquerChangementDepartement/Localite).
      { emitEvent: false },
    );

    if (donnees.departement !== null) {
      this.chargerLocalites(donnees.departement);
    }
    if (donnees.localite_id !== null) {
      this.chargerQuartiers(donnees.localite_id);
    }
  }

  erreurChampEdition(champ: string): string | null {
    return erreurChamp(this.derniereErreurEdition(), champ);
  }

  selectionnerLogo(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';
    if (!fichier || !this.validerImage(fichier)) {
      return;
    }
    if (this.apercuLogoLocal) {
      URL.revokeObjectURL(this.apercuLogoLocal);
    }
    this.apercuLogoLocal = URL.createObjectURL(fichier);
    this.logoFichier.set(fichier);
    this.logoRetire.set(false);
    this.logoApercu.set(this.apercuLogoLocal);
  }

  retirerLogo(): void {
    if (this.apercuLogoLocal) {
      URL.revokeObjectURL(this.apercuLogoLocal);
      this.apercuLogoLocal = null;
    }
    this.logoFichier.set(null);
    this.logoApercu.set(null);
    this.logoRetire.set(true);
  }

  selectionnerCouverture(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = '';
    if (!fichier || !this.validerImage(fichier)) {
      return;
    }
    if (this.apercuCouvertureLocal) {
      URL.revokeObjectURL(this.apercuCouvertureLocal);
    }
    this.apercuCouvertureLocal = URL.createObjectURL(fichier);
    this.couvertureFichier.set(fichier);
    this.couvertureRetiree.set(false);
    this.couvertureApercu.set(this.apercuCouvertureLocal);
  }

  retirerCouverture(): void {
    if (this.apercuCouvertureLocal) {
      URL.revokeObjectURL(this.apercuCouvertureLocal);
      this.apercuCouvertureLocal = null;
    }
    this.couvertureFichier.set(null);
    this.couvertureApercu.set(null);
    this.couvertureRetiree.set(true);
  }

  private validerImage(fichier: File): boolean {
    this.erreurImageEdition.set(null);
    if (!fichier.type.startsWith('image/')) {
      this.erreurImageEdition.set('Le fichier sélectionné doit être une image.');
      return false;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.erreurImageEdition.set("L'image ne doit pas dépasser 5 Mo.");
      return false;
    }
    return true;
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
        // Rattrape le cas où un type avait déjà été choisi avant que les correspondances arrivent
        // (création uniquement : en édition, les catégories chargées sont la source de vérité —
        // on ne force pas la catégorie principale sur les données existantes au chargement).
        const typeActuel = this.formulaire.controls.type_partenaire.value;
        if (!this.modeEdition() && typeActuel && this.categorieAutoId === null) {
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

    if (this.modeEdition()) {
      this.soumettreEdition();
      return;
    }

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

  private soumettreEdition(): void {
    this.derniereErreurEdition.set(null);
    this.messageSuccesEdition.set(null);

    this.service.modifier(this.partenaireId()!, this.construirePayloadEdition()).subscribe({
      next: (donnees) => {
        this.envoiEnCours.set(false);
        this.appliquerDonneesEdition(donnees);
        this.messageSuccesEdition.set('Modifications enregistrées avec succès.');
        this.enregistre.emit(donnees);
      },
      error: (erreur: unknown) => {
        this.envoiEnCours.set(false);
        this.derniereErreurEdition.set(erreur);
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

  /** PATCH des seuls champs réellement modifiés par rapport aux données chargées. */
  private construirePayloadEdition(): RequeteEditionPartenaire {
    const v = this.formulaire.getRawValue();
    const original = this.donneesOriginalesEdition!;
    const corps: RequeteEditionPartenaire = {};

    const siTexteModifie = (actuel: string, originalValeur: string): string | undefined => {
      const valeur = actuel.trim();
      return valeur !== (originalValeur ?? '') ? valeur : undefined;
    };

    const prenom = siTexteModifie(v.prenom, original.prenom);
    if (prenom !== undefined) corps.prenom = prenom;
    const nom = siTexteModifie(v.nom, original.nom);
    if (nom !== undefined) corps.nom = nom;
    const nomCommerce = siTexteModifie(v.nom_commerce, original.nom_commerce);
    if (nomCommerce !== undefined) corps.nom_commerce = nomCommerce;
    const description = siTexteModifie(v.description, original.description);
    if (description !== undefined) corps.description = description;
    const secteur = siTexteModifie(v.secteur, original.secteur);
    if (secteur !== undefined) corps.secteur = secteur;
    const adresse = siTexteModifie(v.adresse, original.adresse);
    if (adresse !== undefined) corps.adresse = adresse;
    const telephonePro = siTexteModifie(v.telephone_pro, original.telephone_pro);
    if (telephonePro !== undefined) corps.telephone_pro = telephonePro;
    const whatsapp = siTexteModifie(v.whatsapp, original.whatsapp);
    if (whatsapp !== undefined) corps.whatsapp = whatsapp;
    const emailPro = siTexteModifie(v.email_pro, original.email_pro);
    if (emailPro !== undefined) corps.email_pro = emailPro;

    if (v.type_partenaire !== original.type_partenaire) {
      corps.type_partenaire = v.type_partenaire;
    }

    const departementActuel = v.departement ? Number(v.departement) : null;
    if (departementActuel !== original.departement) {
      corps.departement = departementActuel;
    }
    const localiteActuelle = v.localite_id ? Number(v.localite_id) : null;
    if (localiteActuelle !== original.localite_id) {
      corps.localite_id = localiteActuelle;
    }
    const quartierActuel = v.quartier_id ? Number(v.quartier_id) : null;
    if (quartierActuel !== original.quartier_id) {
      corps.quartier_id = quartierActuel;
    }

    const categoriesActuelles = [...this.categoriesSelectionnees()].sort((a, b) => a - b);
    const categoriesOriginales = original.categories.map((c) => c.id).sort((a, b) => a - b);
    if (JSON.stringify(categoriesActuelles) !== JSON.stringify(categoriesOriginales)) {
      corps.categories = categoriesActuelles;
    }

    if (this.logoFichier()) {
      corps.logo = this.logoFichier()!;
    } else if (this.logoRetire()) {
      corps.supprimer_logo = true;
    }
    if (this.couvertureFichier()) {
      corps.photo_couverture = this.couvertureFichier()!;
    } else if (this.couvertureRetiree()) {
      corps.supprimer_couverture = true;
    }

    return corps;
  }

  private videSiVide(valeur: string): string | undefined {
    const texte = valeur.trim();
    return texte ? texte : undefined;
  }
}

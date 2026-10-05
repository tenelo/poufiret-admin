import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ProfilPartenaireService } from './profil-partenaire.service';
import { LocaliteQuartierService } from '../../../noyau/geo/localite-quartier.service';
import { Departement } from '../../../modeles/departement.model';
import { OptionGeo } from '../../../modeles/geographie.model';
import { formaterLocalisation } from '../../../partage/formater-localisation';
import { CarteMonCompte } from '../../../partage/mon-compte/carte-mon-compte/carte-mon-compte';
import {
  OPTIONS_TYPE_PARTENAIRE,
  ProfilPartenaire,
  RequeteMiseAJourProfilPartenaire,
} from '../../../modeles/profil-partenaire.model';

// Taille max acceptée côté client pour le logo / la photo de couverture.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

type ChampImage = 'logo' | 'photo_couverture';

/**
 * Page "Mon profil" de l'espace partenaire : identité du compte (carte
 * partagée CarteMonCompte, GET/PATCH /auth/moi/) + consultation et
 * modification des informations de la vitrine (GET/PATCH
 * /auth/mon-profil-partenaire/).
 */
@Component({
  selector: 'app-mon-profil',
  imports: [ReactiveFormsModule, CarteMonCompte],
  templateUrl: './mon-profil.html',
  styleUrl: './mon-profil.scss',
})
export class MonProfil implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profilPartenaireService = inject(ProfilPartenaireService);
  private readonly localiteQuartierService = inject(LocaliteQuartierService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly profil = signal<ProfilPartenaire | null>(null);

  /** false = carte en lecture (défaut), true = formulaire d'édition. */
  readonly modeEdition = signal(false);

  readonly departements = signal<Departement[]>([]);

  readonly localites = signal<OptionGeo[]>([]);
  readonly chargementLocalites = signal(false);
  readonly erreurLocalites = signal<string | null>(null);

  readonly quartiers = signal<OptionGeo[]>([]);
  readonly chargementQuartiers = signal(false);
  readonly erreurQuartiers = signal<string | null>(null);

  // Aperçus locaux (URL.createObjectURL) des images sélectionnées mais pas encore envoyées.
  readonly apercuLogo = signal<string | null>(null);
  readonly apercuCouverture = signal<string | null>(null);
  private readonly fichierLogo = signal<File | null>(null);
  private readonly fichierCouverture = signal<File | null>(null);

  readonly televersementImagesEnCours = signal(false);
  readonly messageErreurImages = signal<string | null>(null);
  readonly messageSuccesImages = signal<string | null>(null);

  /** True si au moins une nouvelle image attend d'être envoyée. */
  get imagesModifiees(): boolean {
    return this.fichierLogo() !== null || this.fichierCouverture() !== null;
  }

  readonly optionsTypePartenaire = OPTIONS_TYPE_PARTENAIRE;

  readonly formulaire = this.formBuilder.nonNullable.group({
    nom_commerce: ['', [Validators.required]],
    description: [''],
    type_partenaire: ['', [Validators.required]],
    adresse: [''],
    localite_id: [''],
    quartier_id: [''],
    secteur: [''],
    latitude: [''],
    longitude: [''],
    description_acces: [''],
    telephone_pro: [''],
    whatsapp: [''],
    email_pro: ['', [Validators.email]],
  });

  ngOnInit(): void {
    this.chargerProfil();
    this.chargerDepartements();

    this.formulaire.controls.localite_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valeur) => this.appliquerChangementLocalite(valeur));
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
        this.erreurLocalites.set(this.extraireMessageErreur(erreur));
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
        this.erreurQuartiers.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  /** « Quartier, Localité (Département) » à partir des noms rattachés, sinon repli sur les anciens textes. */
  localisationAffichee(profil: ProfilPartenaire): string {
    return formaterLocalisation(profil);
  }

  /** Ancien texte "ville" à proposer tant que la localité n'a pas été rattachée, sinon null. */
  indiceAncienneLocalite(profil: ProfilPartenaire): string | null {
    return profil.localite_id === null && profil.ville ? profil.ville : null;
  }

  /** Ancien texte "quartier" à proposer tant que le quartier n'a pas été rattaché, sinon null. */
  indiceAncienQuartier(profil: ProfilPartenaire): string | null {
    return profil.quartier_id === null && profil.quartier ? profil.quartier : null;
  }

  ngOnDestroy(): void {
    this.revoquerApercus();
  }

  chargerProfil(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.profilPartenaireService.chargerProfil().subscribe({
      next: (profil) => {
        this.chargementEnCours.set(false);
        this.appliquerProfil(profil);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  chargerDepartements(): void {
    this.profilPartenaireService.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => {
        // Non bloquant : sans départements, le sélecteur du formulaire reste
        // vide mais la carte en lecture et le reste du formulaire fonctionnent.
      },
    });
  }

  /** Bascule vers le formulaire d'édition (les champs reflètent déjà le profil chargé). */
  activerEdition(): void {
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.modeEdition.set(true);
  }

  /** Repasse en lecture sans sauvegarder : restaure le formulaire et abandonne les images en attente. */
  annulerEdition(): void {
    const profil = this.profil();
    if (profil) {
      this.appliquerProfil(profil);
    }
    this.revoquerApercus();
    this.messageErreur.set(null);
    this.messageSucces.set(null);
    this.messageErreurImages.set(null);
    this.messageSuccesImages.set(null);
    this.modeEdition.set(false);
  }

  soumettre(): void {
    if (this.formulaire.invalid || this.enregistrementEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const donnees = this.construirePayload();

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    this.profilPartenaireService.modifierProfil(donnees).subscribe({
      next: (profil) => {
        this.enregistrementEnCours.set(false);
        this.appliquerProfil(profil);
        this.modeEdition.set(false);
        this.messageSucces.set('Profil mis à jour avec succès.');
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  private construirePayload(): RequeteMiseAJourProfilPartenaire {
    const v = this.formulaire.getRawValue();
    return {
      nom_commerce: v.nom_commerce,
      description: v.description,
      type_partenaire: v.type_partenaire,
      adresse: v.adresse,
      secteur: v.secteur,
      localite_id: v.localite_id ? Number(v.localite_id) : null,
      quartier_id: v.quartier_id ? Number(v.quartier_id) : null,
      latitude: v.latitude !== '' ? Number(v.latitude) : null,
      longitude: v.longitude !== '' ? Number(v.longitude) : null,
      description_acces: v.description_acces,
      telephone_pro: v.telephone_pro,
      whatsapp: v.whatsapp,
      email_pro: v.email_pro,
    };
  }

  /** Nom du département affiché en lecture : préfère departement_nom, sinon retombe sur la liste chargée. */
  nomDepartement(profil: ProfilPartenaire): string {
    if (profil.departement_nom) {
      return profil.departement_nom;
    }
    if (profil.departement === null) {
      return 'non renseigné';
    }
    return this.departements().find((d) => d.id === profil.departement)?.nom ?? `Département #${profil.departement}`;
  }

  /** Point GPS affiché en lecture. */
  pointGpsAffiche(profil: ProfilPartenaire): string {
    if (profil.latitude === null || profil.longitude === null) {
      return 'non défini';
    }
    return `${profil.latitude}, ${profil.longitude}`;
  }

  /** Appelé lors du choix d'un fichier pour le logo ou la photo de couverture. */
  selectionnerImage(evenement: Event, champ: ChampImage): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = ''; // permet de resélectionner le même fichier plus tard

    if (!fichier) {
      return;
    }

    this.messageErreurImages.set(null);
    this.messageSuccesImages.set(null);

    if (!fichier.type.startsWith('image/')) {
      this.messageErreurImages.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.messageErreurImages.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const url = URL.createObjectURL(fichier);
    if (champ === 'logo') {
      if (this.apercuLogo()) URL.revokeObjectURL(this.apercuLogo()!);
      this.fichierLogo.set(fichier);
      this.apercuLogo.set(url);
    } else {
      if (this.apercuCouverture()) URL.revokeObjectURL(this.apercuCouverture()!);
      this.fichierCouverture.set(fichier);
      this.apercuCouverture.set(url);
    }
  }

  /** Envoie au backend le(s) fichier(s) sélectionné(s) pour le logo et/ou la couverture. */
  enregistrerImages(): void {
    if (!this.imagesModifiees || this.televersementImagesEnCours()) {
      return;
    }

    this.televersementImagesEnCours.set(true);
    this.messageErreurImages.set(null);
    this.messageSuccesImages.set(null);

    this.profilPartenaireService
      .televerserImagesProfil({
        logo: this.fichierLogo() ?? undefined,
        photoCouverture: this.fichierCouverture() ?? undefined,
      })
      .subscribe({
        next: (profil) => {
          this.televersementImagesEnCours.set(false);
          this.profil.set(profil);
          this.revoquerApercus();
          this.messageSuccesImages.set('Images mises à jour avec succès.');
        },
        error: (erreur: unknown) => {
          this.televersementImagesEnCours.set(false);
          this.messageErreurImages.set(this.extraireMessageErreur(erreur));
        },
      });
  }

  private revoquerApercus(): void {
    if (this.apercuLogo()) URL.revokeObjectURL(this.apercuLogo()!);
    if (this.apercuCouverture()) URL.revokeObjectURL(this.apercuCouverture()!);
    this.apercuLogo.set(null);
    this.apercuCouverture.set(null);
    this.fichierLogo.set(null);
    this.fichierCouverture.set(null);
  }

  /** Liste des options du sélecteur de type, en y ajoutant la valeur courante si elle est inconnue. */
  optionsAvecValeurCourante(valeurCourante: string): { valeur: string; libelle: string }[] {
    if (!valeurCourante || this.optionsTypePartenaire.some((o) => o.valeur === valeurCourante)) {
      return this.optionsTypePartenaire;
    }
    return [...this.optionsTypePartenaire, { valeur: valeurCourante, libelle: valeurCourante }];
  }

  private appliquerProfil(profil: ProfilPartenaire): void {
    this.profil.set(profil);
    this.formulaire.patchValue(
      {
        nom_commerce: profil.nom_commerce,
        description: profil.description,
        type_partenaire: profil.type_partenaire,
        adresse: profil.adresse,
        localite_id: profil.localite_id !== null ? String(profil.localite_id) : '',
        quartier_id: profil.quartier_id !== null ? String(profil.quartier_id) : '',
        secteur: profil.secteur,
        latitude: profil.latitude !== null ? String(profil.latitude) : '',
        longitude: profil.longitude !== null ? String(profil.longitude) : '',
        description_acces: profil.description_acces,
        telephone_pro: profil.telephone_pro,
        whatsapp: profil.whatsapp,
        email_pro: profil.email_pro,
      },
      // emitEvent: false — évite que le patch de localite_id ne réinitialise quartier_id
      // via appliquerChangementLocalite() avant que chargerCascadeInitiale() ne l'ait chargé.
      { emitEvent: false },
    );
    this.chargerCascadeInitiale(profil);
  }

  /** Précharge les localités du département du partenaire, puis les quartiers de sa localité. */
  private chargerCascadeInitiale(profil: ProfilPartenaire): void {
    this.localites.set([]);
    this.quartiers.set([]);
    this.erreurLocalites.set(null);
    this.erreurQuartiers.set(null);
    if (profil.departement !== null) {
      this.chargerLocalites(profil.departement);
    }
    if (profil.localite_id !== null) {
      this.chargerQuartiers(profil.localite_id);
    }
  }

  private extraireMessageErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      // status 0 : la requête n'a pas atteint le serveur (réseau coupé, ou requête
      // bloquée par le navigateur faute de headers CORS autorisant cette origine).
      if (erreur.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
      }

      const corps = erreur.error;
      // Une page d'erreur HTML (ex. 500 Django hors mode debug) n'est pas un
      // message affichable : on retombe sur le message générique dans ce cas.
      if (typeof corps === 'string' && !/^\s*<(!doctype|html)/i.test(corps)) {
        return corps;
      }
      // Format d'erreur du backend Poufiret : {erreur, code, message, details: {detail}}
      if (typeof corps?.message === 'string') {
        return corps.message;
      }
      if (typeof corps?.details?.detail === 'string') {
        return corps.details.detail;
      }
      if (typeof corps?.detail === 'string') {
        return corps.detail;
      }
      if (corps?.non_field_errors?.length) {
        return corps.non_field_errors[0];
      }
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  }
}

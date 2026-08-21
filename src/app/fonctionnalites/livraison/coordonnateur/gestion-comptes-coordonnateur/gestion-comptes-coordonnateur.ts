import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ComptesLivraisonService } from '../comptes-livraison.service';
import { DialogCreationCompte, ValeursFormulaireCompteEquipe } from '../dialog-creation-compte/dialog-creation-compte';
import { extraireMessageErreurLivraison } from '../../extraire-message-erreur-livraison';
import { telHref } from '../../formatage-livraison';
import { Departement } from '../../../../modeles/departement.model';
import {
  GestionnaireCompte,
  LivreurCompte,
  SuperviseurCompte,
  TypeCompteEquipe,
  nomAfficheCompteEquipe,
} from '../../modeles/compte-equipe-livraison.model';
import { iconeVehicule } from '../../modeles/livreur-bureau.model';

// Réponse de création commune aux 3 types (chacune a des champs en plus,
// structurellement compatibles avec ce sous-ensemble).
interface ReponseCreationCompte {
  telephone: string;
  pin_clair: string;
  message?: string;
}

interface CibleDesactivation {
  type: TypeCompteEquipe;
  id: number | string;
  nom: string;
}

interface SuccesCreation {
  type: TypeCompteEquipe;
  telephone: string;
  pinClair: string;
}

/**
 * Écran coordonnateur "Gestion des comptes" : choix d'une ville puis
 * superviseurs/gestionnaires/livreurs de cette ville, avec création (PIN
 * affiché une fois) et désactivation. Module livraison isolé.
 */
@Component({
  selector: 'app-gestion-comptes-coordonnateur',
  imports: [DialogCreationCompte],
  templateUrl: './gestion-comptes-coordonnateur.html',
  styleUrl: './gestion-comptes-coordonnateur.scss',
})
export class GestionComptesCoordonnateur implements OnInit {
  private readonly service = inject(ComptesLivraisonService);

  readonly nomAfficheCompteEquipe = nomAfficheCompteEquipe;
  readonly iconeVehicule = iconeVehicule;
  readonly telHref = telHref;

  readonly departements = signal<Departement[]>([]);
  readonly chargementDepartements = signal(true);
  readonly erreurDepartements = signal<string | null>(null);

  readonly villeSelectionneeId = signal<number | null>(null);
  readonly villeSelectionnee = computed<Departement | null>(
    () => this.departements().find((d) => d.id === this.villeSelectionneeId()) ?? null,
  );

  readonly messageSucces = signal<string | null>(null);

  readonly superviseurs = signal<SuperviseurCompte[]>([]);
  readonly chargementSuperviseurs = signal(false);
  readonly erreurSuperviseurs = signal<string | null>(null);

  readonly gestionnaires = signal<GestionnaireCompte[]>([]);
  readonly chargementGestionnaires = signal(false);
  readonly erreurGestionnaires = signal<string | null>(null);

  readonly livreurs = signal<LivreurCompte[]>([]);
  readonly chargementLivreurs = signal(false);
  readonly erreurLivreurs = signal<string | null>(null);

  // ---- Création ----
  readonly dialogTypeOuvert = signal<TypeCompteEquipe | null>(null);
  readonly creationEnCours = signal(false);
  readonly erreurCreation = signal<string | null>(null);
  readonly reponseSucces = signal<SuccesCreation | null>(null);
  readonly pinCopie = signal(false);

  // ---- Désactivation ----
  readonly compteADesactiver = signal<CibleDesactivation | null>(null);
  readonly desactivationEnCours = signal(false);
  readonly erreurDesactivation = signal<string | null>(null);

  ngOnInit(): void {
    this.chargerDepartements();
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
        this.erreurDepartements.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  changerVille(valeur: string): void {
    const id = valeur ? Number(valeur) : null;
    this.villeSelectionneeId.set(id);
    this.messageSucces.set(null);
    this.reponseSucces.set(null);
    if (id) {
      this.chargerSuperviseurs();
      this.chargerGestionnaires();
      this.chargerLivreurs();
    }
  }

  chargerSuperviseurs(): void {
    const villeId = this.villeSelectionneeId();
    if (!villeId) return;
    this.chargementSuperviseurs.set(true);
    this.erreurSuperviseurs.set(null);
    this.service.listerSuperviseurs(villeId).subscribe({
      next: (liste) => {
        this.chargementSuperviseurs.set(false);
        this.superviseurs.set(liste);
      },
      error: (erreur: unknown) => {
        this.chargementSuperviseurs.set(false);
        this.erreurSuperviseurs.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  chargerGestionnaires(): void {
    const villeId = this.villeSelectionneeId();
    if (!villeId) return;
    this.chargementGestionnaires.set(true);
    this.erreurGestionnaires.set(null);
    this.service.listerGestionnaires(villeId).subscribe({
      next: (liste) => {
        this.chargementGestionnaires.set(false);
        this.gestionnaires.set(liste);
      },
      error: (erreur: unknown) => {
        this.chargementGestionnaires.set(false);
        this.erreurGestionnaires.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  chargerLivreurs(): void {
    const villeId = this.villeSelectionneeId();
    if (!villeId) return;
    this.chargementLivreurs.set(true);
    this.erreurLivreurs.set(null);
    this.service.listerLivreurs(villeId).subscribe({
      next: (liste) => {
        this.chargementLivreurs.set(false);
        this.livreurs.set(liste);
      },
      error: (erreur: unknown) => {
        this.chargementLivreurs.set(false);
        this.erreurLivreurs.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  private rafraichirSection(type: TypeCompteEquipe): void {
    switch (type) {
      case 'superviseur':
        this.chargerSuperviseurs();
        break;
      case 'gestionnaire':
        this.chargerGestionnaires();
        break;
      case 'livreur':
        this.chargerLivreurs();
        break;
    }
  }

  // ---- Création ----

  ouvrirCreation(type: TypeCompteEquipe): void {
    this.erreurCreation.set(null);
    this.dialogTypeOuvert.set(type);
  }

  fermerCreation(): void {
    this.dialogTypeOuvert.set(null);
  }

  soumettreCreation(valeurs: ValeursFormulaireCompteEquipe): void {
    const ville = this.villeSelectionnee();
    const type = this.dialogTypeOuvert();
    if (!ville || !type || this.creationEnCours()) {
      return;
    }

    this.creationEnCours.set(true);
    this.erreurCreation.set(null);

    let requete$: Observable<ReponseCreationCompte>;
    switch (type) {
      case 'superviseur':
        requete$ = this.service.creerSuperviseur({
          telephone: valeurs.telephone,
          prenom: valeurs.prenom,
          nom: valeurs.nom,
          nom_bureau: valeurs.nom_bureau,
          ville_id: ville.id,
        });
        break;
      case 'gestionnaire':
        requete$ = this.service.creerGestionnaire({
          telephone: valeurs.telephone,
          prenom: valeurs.prenom,
          nom: valeurs.nom,
          nom_bureau: valeurs.nom_bureau,
          ville_id: ville.id,
        });
        break;
      case 'livreur':
        requete$ = this.service.creerLivreur({
          telephone: valeurs.telephone,
          prenom: valeurs.prenom,
          nom: valeurs.nom,
          type_vehicule: valeurs.type_vehicule,
          immatriculation: valeurs.immatriculation,
          ville_id: ville.id,
        });
        break;
    }

    requete$.subscribe({
      next: (reponse) => {
        this.creationEnCours.set(false);
        this.dialogTypeOuvert.set(null);
        this.reponseSucces.set({ type, telephone: reponse.telephone, pinClair: reponse.pin_clair });
        this.rafraichirSection(type);
      },
      error: (erreur: unknown) => {
        this.creationEnCours.set(false);
        this.erreurCreation.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  fermerPanneauSucces(): void {
    this.reponseSucces.set(null);
    this.pinCopie.set(false);
  }

  copierPin(): void {
    const pin = this.reponseSucces()?.pinClair;
    if (!pin) return;
    navigator.clipboard.writeText(pin).then(() => {
      this.pinCopie.set(true);
      setTimeout(() => this.pinCopie.set(false), 2000);
    });
  }

  // ---- Désactivation ----

  demanderDesactivation(type: TypeCompteEquipe, id: number | string, nom: string): void {
    this.erreurDesactivation.set(null);
    this.compteADesactiver.set({ type, id, nom });
  }

  annulerDesactivation(): void {
    this.compteADesactiver.set(null);
  }

  confirmerDesactivation(): void {
    const cible = this.compteADesactiver();
    if (!cible || this.desactivationEnCours()) {
      return;
    }
    this.desactivationEnCours.set(true);
    this.erreurDesactivation.set(null);

    let requete$: Observable<{ detail: string }>;
    switch (cible.type) {
      case 'superviseur':
        requete$ = this.service.desactiverSuperviseur(cible.id as number);
        break;
      case 'gestionnaire':
        requete$ = this.service.desactiverGestionnaire(cible.id as number);
        break;
      case 'livreur':
        requete$ = this.service.desactiverLivreur(cible.id as string);
        break;
    }

    requete$.subscribe({
      next: () => {
        this.desactivationEnCours.set(false);
        this.compteADesactiver.set(null);
        this.messageSucces.set(`${cible.nom} désactivé.`);
        this.rafraichirSection(cible.type);
      },
      error: (erreur: unknown) => {
        this.desactivationEnCours.set(false);
        this.erreurDesactivation.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';

import { GestionAdminsService } from './gestion-admins.service';
import { CreerAdmin } from './creer-admin/creer-admin';
import { EditerCapacites } from './editer-capacites/editer-capacites';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import {
  AdminGere,
  ReponseCreationAdmin,
  RequeteCreerAdmin,
  compterCapacitesActives,
} from '../../../modeles/gestion-admins.model';
import { NomCapacite } from '../../../modeles/permissions-admin.model';

/**
 * Écran "Gestion des admins" (super-admin ou capacité `gerer_admins`) :
 * liste des comptes admin, création, édition des capacités, révocation.
 */
@Component({
  selector: 'app-gestion-admins',
  imports: [CreerAdmin, EditerCapacites],
  templateUrl: './gestion-admins.html',
  styleUrl: './gestion-admins.scss',
})
export class GestionAdmins implements OnInit {
  private readonly service = inject(GestionAdminsService);

  readonly compterCapacitesActives = compterCapacitesActives;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly admins = signal<AdminGere[]>([]);

  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);

  // ---- Création ----
  readonly panneauCreationOuvert = signal(false);
  readonly envoiCreationEnCours = signal(false);
  readonly erreurCreation = signal<string | null>(null);
  readonly reponseCreationSucces = signal<ReponseCreationAdmin | null>(null);
  readonly pinCopie = signal(false);

  // ---- Édition des capacités ----
  readonly adminEnEditionCapacites = signal<AdminGere | null>(null);
  readonly envoiCapacitesEnCours = signal(false);
  readonly erreurCapacites = signal<string | null>(null);

  // ---- Révocation ----
  readonly adminARevoquer = signal<AdminGere | null>(null);
  readonly motifRevocation = signal('');
  readonly revocationEnCours = signal(false);

  ngOnInit(): void {
    this.chargerAdmins();
  }

  chargerAdmins(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerAdmins().subscribe({
      next: (admins) => {
        this.chargementEnCours.set(false);
        this.admins.set(admins);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Création ----

  ouvrirCreation(): void {
    this.erreurCreation.set(null);
    this.reponseCreationSucces.set(null);
    this.panneauCreationOuvert.set(true);
  }

  fermerCreation(): void {
    this.panneauCreationOuvert.set(false);
    this.erreurCreation.set(null);
  }

  soumettreCreation(donnees: RequeteCreerAdmin): void {
    this.envoiCreationEnCours.set(true);
    this.erreurCreation.set(null);

    this.service.creerAdmin(donnees).subscribe({
      next: (reponse) => {
        this.envoiCreationEnCours.set(false);
        this.panneauCreationOuvert.set(false);
        this.reponseCreationSucces.set(reponse);
        this.chargerAdmins();
      },
      error: (erreur: unknown) => {
        this.envoiCreationEnCours.set(false);
        this.erreurCreation.set(extraireMessageErreur(erreur));
      },
    });
  }

  fermerPanneauSucces(): void {
    this.reponseCreationSucces.set(null);
    this.pinCopie.set(false);
  }

  copierPin(): void {
    const pin = this.reponseCreationSucces()?.pin_clair;
    if (!pin) {
      return;
    }
    navigator.clipboard.writeText(pin).then(() => {
      this.pinCopie.set(true);
      setTimeout(() => this.pinCopie.set(false), 2000);
    });
  }

  // ---- Édition des capacités ----

  ouvrirEditionCapacites(admin: AdminGere): void {
    this.erreurCapacites.set(null);
    this.adminEnEditionCapacites.set(admin);
  }

  fermerEditionCapacites(): void {
    this.adminEnEditionCapacites.set(null);
    this.erreurCapacites.set(null);
  }

  enregistrerCapacites(diff: Partial<Record<NomCapacite, boolean>>): void {
    const admin = this.adminEnEditionCapacites();
    if (!admin) {
      return;
    }
    this.envoiCapacitesEnCours.set(true);
    this.erreurCapacites.set(null);

    this.service.modifierCapacites(admin.id, diff).subscribe({
      next: (adminMisAJour) => {
        this.envoiCapacitesEnCours.set(false);
        this.adminEnEditionCapacites.set(null);
        this.messageSucces.set(`Capacités mises à jour pour ${adminMisAJour.nom_complet || adminMisAJour.username}.`);
        this.admins.update((liste) => liste.map((a) => (a.id === adminMisAJour.id ? adminMisAJour : a)));
      },
      error: (erreur: unknown) => {
        this.envoiCapacitesEnCours.set(false);
        this.erreurCapacites.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Révocation ----

  demanderRevocation(admin: AdminGere): void {
    this.messageErreur.set(null);
    this.motifRevocation.set('');
    this.adminARevoquer.set(admin);
  }

  annulerRevocation(): void {
    this.adminARevoquer.set(null);
  }

  changerMotifRevocation(valeur: string): void {
    this.motifRevocation.set(valeur);
  }

  confirmerRevocation(): void {
    const admin = this.adminARevoquer();
    if (!admin || this.revocationEnCours()) {
      return;
    }
    this.revocationEnCours.set(true);
    this.messageErreur.set(null);

    this.service.revoquerAdmin(admin.id, this.motifRevocation().trim() || undefined).subscribe({
      next: () => {
        this.revocationEnCours.set(false);
        this.adminARevoquer.set(null);
        this.messageSucces.set(`${admin.nom_complet || admin.username} n'est plus admin.`);
        this.admins.update((liste) => liste.filter((a) => a.id !== admin.id));
      },
      error: (erreur: unknown) => {
        this.revocationEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.adminARevoquer.set(null);
      },
    });
  }
}

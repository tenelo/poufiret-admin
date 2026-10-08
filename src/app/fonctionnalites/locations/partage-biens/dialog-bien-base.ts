import { Directive, OnInit, WritableSignal, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { LocationService, PrefixeLocation, RessourceBien } from '../location.service';
import { basculerDansEnsemble } from './puces-options';
import { extraireMessageErreur } from '../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ReponseLocationMeta } from '../../../modeles/location-meta.model';
import { BienLocation, OPTIONS_DISPONIBILITE_BIEN } from '../../../modeles/bien-location.model';

/**
 * Socle des dialogs véhicule et hébergement : meta, sections (onglet actif, Photos et Vue 360°
 * accessibles une fois le bien créé), équipements, enregistrement (création puis bascule en mode
 * édition sans refermer), suppression avec proposition de désactivation sur 409. Les sous-classes
 * fournissent leurs champs (appliquer / construireRequete / valider).
 */
@Directive()
export abstract class DialogBienBase<T extends BienLocation, S extends string> implements OnInit {
  protected readonly service = inject(LocationService);

  protected abstract readonly ressource: RessourceBien;
  /** Onglet affiché en cas d'erreur de validation sur un champ donné. */
  protected abstract readonly ongletParChamp: Record<string, S>;

  readonly prefixe = input.required<PrefixeLocation>();
  readonly bien = input<T | null>(null);
  readonly meta = input<ReponseLocationMeta | null>(null);

  readonly ferme = output<void>();

  readonly optionsDisponibilite = OPTIONS_DISPONIBILITE_BIEN;

  abstract readonly ongletActif: WritableSignal<S>;
  readonly metaInterne = signal<ReponseLocationMeta | null>(null);
  readonly bienCourant = signal<T | null>(null);

  readonly nom = signal('');
  readonly description = signal('');
  readonly estActif = signal(true);
  readonly prix = signal('');
  readonly equipementsSelectionnes = signal<Set<string>>(new Set());
  readonly disponibilite = signal('disponible');

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  readonly confirmationSuppression = signal(false);
  readonly suppressionEnCours = signal(false);
  /** Vrai après un 409 : le bien a des demandes, on propose de le désactiver. */
  readonly proposerDesactivation = signal(false);

  protected abstract appliquer(bien: T): void;
  /** Champs propres au bien (le socle ajoute nom, prix, description, est_actif, disponibilite). */
  protected abstract construireRequete(): object;
  /** Erreurs propres au bien, en plus de nom et prix. */
  protected validerChamps(): Record<string, string> {
    return {};
  }

  ngOnInit(): void {
    const meta = this.meta();
    if (meta) {
      this.metaInterne.set(meta);
    } else {
      this.service.meta().subscribe({
        next: (meta) => this.metaInterne.set(meta),
        error: () => undefined,
      });
    }

    const bien = this.bien();
    this.bienCourant.set(bien);
    if (bien) {
      this.nom.set(bien.nom);
      this.description.set(bien.description ?? '');
      this.estActif.set(bien.est_actif);
      this.prix.set(String(bien.prix));
      this.disponibilite.set(bien.disponibilite || 'disponible');
      this.appliquer(bien);
    }
  }

  changerOnglet(onglet: S): void {
    if ((onglet === 'photos' || onglet === 'visite') && !this.bienCourant()) {
      return;
    }
    this.ongletActif.set(onglet);
  }

  basculerEquipement(valeur: string): void {
    this.equipementsSelectionnes.update((ensemble) => basculerDansEnsemble(ensemble, valeur));
  }

  soumettre(libellePrix: string): void {
    const prix = Number(this.prix());
    const erreurs: Record<string, string> = {};
    if (!this.nom().trim()) erreurs['nom'] = 'Le titre est requis.';
    if (this.prix().trim() === '' || Number.isNaN(prix) || prix < 0) {
      erreurs['prix'] = `${libellePrix} doit être un nombre positif ou nul.`;
    }
    Object.assign(erreurs, this.validerChamps());
    this.erreursChamps.set(erreurs);
    const premierChamp = Object.keys(erreurs)[0];
    if (premierChamp) {
      const onglet = this.ongletParChamp[premierChamp];
      if (onglet) this.ongletActif.set(onglet);
      return;
    }

    const donnees = {
      nom: this.nom().trim(),
      prix,
      description: this.description().trim(),
      est_actif: this.estActif(),
      disponibilite: this.disponibilite() || undefined,
      ...this.construireRequete(),
    };

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);

    const courant = this.bienCourant();
    const requete = courant
      ? this.service.modifierBien<T>(this.prefixe(), this.ressource, courant.id, donnees)
      : this.service.creerBien<T>(this.prefixe(), this.ressource, donnees);

    requete.subscribe({
      next: (bien) => {
        this.enregistrementEnCours.set(false);
        this.bienCourant.set(bien);
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Suppression / désactivation ----

  demanderSuppression(): void {
    this.messageErreur.set(null);
    this.proposerDesactivation.set(false);
    this.confirmationSuppression.set(true);
  }

  annulerSuppression(): void {
    this.confirmationSuppression.set(false);
    this.proposerDesactivation.set(false);
  }

  supprimer(): void {
    const courant = this.bienCourant();
    if (!courant || this.suppressionEnCours()) return;
    this.suppressionEnCours.set(true);
    this.messageErreur.set(null);

    this.service.supprimerBien(this.prefixe(), this.ressource, courant.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.ferme.emit();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
          this.proposerDesactivation.set(true);
          return;
        }
        this.confirmationSuppression.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  desactiver(): void {
    const courant = this.bienCourant();
    if (!courant || this.suppressionEnCours()) return;
    this.suppressionEnCours.set(true);

    this.service.modifierBien<T>(this.prefixe(), this.ressource, courant.id, { est_actif: false }).subscribe({
      next: (bien) => {
        this.suppressionEnCours.set(false);
        this.bienCourant.set(bien);
        this.estActif.set(false);
        this.annulerSuppression();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.annulerSuppression();
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Utilitaires de formulaire ----

  protected texte(valeur: number | null | undefined): string {
    return valeur !== null && valeur !== undefined ? String(valeur) : '';
  }

  protected nombreOuNull(valeur: string): number | null {
    const texte = valeur.trim();
    if (!texte) return null;
    const nombre = Number(texte);
    return Number.isNaN(nombre) ? null : nombre;
  }
}

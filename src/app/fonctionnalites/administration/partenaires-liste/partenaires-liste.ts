import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { PartenairesListeService } from './partenaires-liste.service';
import { extraireMessageErreur, erreurChamp } from '../tableau-de-bord-admin/extraire-message-erreur';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { Departement } from '../../../modeles/departement.model';
import { OPTIONS_TYPE_PARTENAIRE } from '../../../modeles/profil-partenaire.model';
import {
  FiltresPartenairesListe,
  OPTIONS_STATUT_PARTENAIRE_LISTE,
  PartenaireListe,
  StatutPartenaireListe,
  classeChipStatutPartenaireListe,
} from '../../../modeles/partenaire-liste.model';
import { EntreeHistoriqueTelephone } from '../../../modeles/changement-telephone-partenaire.model';

// Délai de silence avant de relancer la recherche (filtrage backend).
const DEBOUNCE_RECHERCHE_MS = 350;

/**
 * Écran "Partenaires" (capacité voir_indicateurs) : liste plate filtrable
 * (recherche, type, statut, département — filtrage backend), export CSV
 * respectant les filtres courants, détail secondaire au clic sur une ligne.
 * Seule action de modification : changer le numéro de connexion d'un
 * partenaire (capacité `modifier_identifiant_partenaire`, privilégiée).
 */
@Component({
  selector: 'app-partenaires-liste',
  imports: [],
  templateUrl: './partenaires-liste.html',
  styleUrl: './partenaires-liste.scss',
})
export class PartenairesListe implements OnInit {
  private readonly service = inject(PartenairesListeService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly optionsType = OPTIONS_TYPE_PARTENAIRE;
  readonly optionsStatut = OPTIONS_STATUT_PARTENAIRE_LISTE;
  readonly classeChipStatut = classeChipStatutPartenaireListe;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly partenaires = signal<PartenaireListe[]>([]);
  readonly total = signal(0);

  readonly departements = signal<Departement[]>([]);

  readonly rechercheTexte = signal('');
  readonly filtreType = signal('');
  readonly filtreStatut = signal<StatutPartenaireListe | ''>('');
  readonly filtreDepartement = signal<number | ''>('');

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  // Ligne dont le détail secondaire est déplié, ou null.
  readonly partenaireOuvertId = signal<number | null>(null);

  readonly peutModifierIdentifiant = computed(
    () =>
      (this.permissionsService.permissionsActuelles()?.isSuperuser ?? false) ||
      this.permissionsService.aLaCapacite('modifier_identifiant_partenaire'),
  );

  // Historique des numéros de connexion de la ligne actuellement dépliée
  // (null = pas encore chargé, [] = chargé et vide → section masquée).
  readonly historiqueTelephone = signal<EntreeHistoriqueTelephone[] | null>(null);
  readonly chargementHistorique = signal(false);

  readonly messageSuccesChangement = signal<string | null>(null);

  // Dialog "Changer le numéro de connexion".
  readonly dialogTelephoneOuvertPour = signal<PartenaireListe | null>(null);
  readonly nouveauTelephoneSaisi = signal('');
  readonly motifChangement = signal('');
  readonly aussiTelephonePro = signal(false);
  readonly confirmationChangementAffichee = signal(false);
  readonly envoiChangementEnCours = signal(false);
  private readonly derniereErreurChangement = signal<unknown>(null);

  readonly nouveauTelephoneValide = computed(() => /^\d{10}$/.test(this.nouveauTelephoneSaisi()));
  readonly motifChangementValide = computed(() => this.motifChangement().trim().length > 0);
  readonly formulaireTelephoneValide = computed(
    () => this.nouveauTelephoneValide() && this.motifChangementValide(),
  );

  readonly erreurNouveauTelephone = computed(() =>
    erreurChamp(this.derniereErreurChangement(), 'nouveau_telephone'),
  );
  readonly erreurMotifChangement = computed(() => erreurChamp(this.derniereErreurChangement(), 'motif'));

  readonly erreurGeneraleChangement = computed(() => {
    const erreur = this.derniereErreurChangement();
    if (!erreur) {
      return null;
    }
    if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
      const corps = erreur.error;
      return typeof corps?.message === 'string'
        ? corps.message
        : 'Ce numéro est déjà utilisé par un autre compte.';
    }
    if (erreur instanceof HttpErrorResponse && erreur.status === 400) {
      // Les erreurs de champ (numéro, motif) sont déjà affichées sous les champs concernés.
      if (this.erreurNouveauTelephone() || this.erreurMotifChangement()) {
        return null;
      }
    }
    return extraireMessageErreur(erreur);
  });

  private readonly rechercheSubject = new Subject<string>();

  ngOnInit(): void {
    this.charger();

    this.service.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => {
        // Non bloquant : sans départements, le sélecteur reste vide.
      },
    });

    this.rechercheSubject
      .pipe(
        debounceTime(DEBOUNCE_RECHERCHE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.charger());
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.lister(this.filtresActuels()).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.partenaires.set(reponse.resultats);
        this.total.set(reponse.total);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private filtresActuels(): FiltresPartenairesListe {
    return {
      q: this.rechercheTexte(),
      type: this.filtreType(),
      statut: this.filtreStatut(),
      departement: this.filtreDepartement(),
    };
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.rechercheSubject.next(valeur);
  }

  changerFiltreType(valeur: string): void {
    this.filtreType.set(valeur);
    this.charger();
  }

  changerFiltreStatut(valeur: string): void {
    this.filtreStatut.set(valeur as StatutPartenaireListe | '');
    this.charger();
  }

  changerFiltreDepartement(valeur: string): void {
    this.filtreDepartement.set(valeur ? Number(valeur) : '');
    this.charger();
  }

  exporter(): void {
    if (this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv(this.filtresActuels()).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerDetail(partenaire: PartenaireListe): void {
    const nouvelId = this.partenaireOuvertId() === partenaire.id ? null : partenaire.id;
    this.partenaireOuvertId.set(nouvelId);
    this.historiqueTelephone.set(null);
    this.messageSuccesChangement.set(null);
    if (nouvelId !== null && this.peutModifierIdentifiant()) {
      this.chargerHistoriqueTelephone(nouvelId);
    }
  }

  private chargerHistoriqueTelephone(id: number): void {
    this.chargementHistorique.set(true);
    this.service.historiqueTelephone(id).subscribe({
      next: (entrees) => {
        this.chargementHistorique.set(false);
        this.historiqueTelephone.set(entrees);
      },
      error: () => {
        this.chargementHistorique.set(false);
        this.historiqueTelephone.set([]);
      },
    });
  }

  ouvrirDialogTelephone(partenaire: PartenaireListe): void {
    this.dialogTelephoneOuvertPour.set(partenaire);
    this.nouveauTelephoneSaisi.set('');
    this.motifChangement.set('');
    this.aussiTelephonePro.set(partenaire.telephone_pro === partenaire.telephone_compte);
    this.derniereErreurChangement.set(null);
    this.confirmationChangementAffichee.set(false);
  }

  fermerDialogTelephone(): void {
    if (this.envoiChangementEnCours()) {
      return;
    }
    this.dialogTelephoneOuvertPour.set(null);
    this.confirmationChangementAffichee.set(false);
  }

  changerNouveauTelephoneSaisi(valeur: string): void {
    this.nouveauTelephoneSaisi.set(valeur.replace(/\D/g, '').slice(0, 10));
  }

  changerMotifChangement(valeur: string): void {
    this.motifChangement.set(valeur);
  }

  changerAussiTelephonePro(valeur: boolean): void {
    this.aussiTelephonePro.set(valeur);
  }

  demanderConfirmationChangement(): void {
    if (!this.formulaireTelephoneValide()) {
      return;
    }
    this.confirmationChangementAffichee.set(true);
  }

  annulerConfirmationChangement(): void {
    this.confirmationChangementAffichee.set(false);
  }

  confirmerChangementTelephone(): void {
    const partenaire = this.dialogTelephoneOuvertPour();
    if (!partenaire || this.envoiChangementEnCours()) {
      return;
    }

    this.envoiChangementEnCours.set(true);
    this.derniereErreurChangement.set(null);

    this.service
      .changerTelephone(partenaire.id, {
        nouveau_telephone: `+225${this.nouveauTelephoneSaisi()}`,
        motif: this.motifChangement().trim(),
        aussi_telephone_pro: this.aussiTelephonePro(),
      })
      .subscribe({
        next: (reponse) => {
          this.envoiChangementEnCours.set(false);
          this.dialogTelephoneOuvertPour.set(null);
          this.confirmationChangementAffichee.set(false);
          this.messageSuccesChangement.set(reponse.message);
          this.charger();
          this.chargerHistoriqueTelephone(partenaire.id);
        },
        error: (erreur: unknown) => {
          this.envoiChangementEnCours.set(false);
          this.confirmationChangementAffichee.set(false);
          this.derniereErreurChangement.set(erreur);
        },
      });
  }

  /** Numéros secondaires à afficher seulement s'ils diffèrent du téléphone du compte. */
  numerosSecondaires(partenaire: PartenaireListe): { libelle: string; valeur: string }[] {
    const secondaires: { libelle: string; valeur: string }[] = [];
    if (partenaire.telephone_pro && partenaire.telephone_pro !== partenaire.telephone_compte) {
      secondaires.push({ libelle: 'Pro', valeur: partenaire.telephone_pro });
    }
    if (
      partenaire.whatsapp &&
      partenaire.whatsapp !== partenaire.telephone_compte &&
      partenaire.whatsapp !== partenaire.telephone_pro
    ) {
      secondaires.push({ libelle: 'WhatsApp', valeur: partenaire.whatsapp });
    }
    return secondaires;
  }

  localite(partenaire: PartenaireListe): string {
    return [partenaire.ville, partenaire.quartier, partenaire.departement_nom].filter(Boolean).join(', ') || '—';
  }

  formaterDateCourte(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  formaterDateComplete(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

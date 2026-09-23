import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { InterventionsService } from './interventions.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import {
  InterventionAdmin,
  OPTIONS_STATUT_INTERVENTION,
  StatutIntervention,
  classeChipStatutIntervention,
} from '../../../modeles/intervention-admin.model';

// Délai de silence avant de relancer la recherche (filtrage backend).
const DEBOUNCE_RECHERCHE_MS = 350;

/**
 * Écran "Demandes d'intervention" (lecture seule, capacité voir_interventions) :
 * liste filtrable par statut/recherche (filtrage backend), export CSV
 * respectant les filtres courants, détail (description + adresse) au clic sur
 * une ligne. Aucune action de modification, aucune transition de statut.
 */
@Component({
  selector: 'app-interventions',
  imports: [],
  templateUrl: './interventions.html',
  styleUrl: './interventions.scss',
})
export class Interventions implements OnInit {
  private readonly service = inject(InterventionsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly optionsStatut = OPTIONS_STATUT_INTERVENTION;
  readonly classeChipStatut = classeChipStatutIntervention;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly interventions = signal<InterventionAdmin[]>([]);
  readonly total = signal(0);

  readonly filtreStatut = signal<StatutIntervention | ''>('');
  readonly rechercheTexte = signal('');

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  // Ligne dont le détail (description + adresse) est déplié, ou null.
  readonly interventionOuverteId = signal<number | null>(null);

  private readonly rechercheSubject = new Subject<string>();

  ngOnInit(): void {
    this.charger();

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

    this.service.lister(this.filtreStatut(), this.rechercheTexte()).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.interventions.set(reponse.resultats);
        this.total.set(reponse.total);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerFiltreStatut(valeur: string): void {
    this.filtreStatut.set(valeur as StatutIntervention | '');
    this.charger();
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.rechercheSubject.next(valeur);
  }

  exporter(): void {
    if (this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv(this.filtreStatut(), this.rechercheTexte()).subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerDetail(intervention: InterventionAdmin): void {
    this.interventionOuverteId.set(
      this.interventionOuverteId() === intervention.id ? null : intervention.id,
    );
  }

  /** Type affiché : type_intervention, sinon type_libre s'il est vide. */
  libelleType(intervention: InterventionAdmin): string {
    return intervention.type_intervention || intervention.type_libre || '—';
  }

  formaterDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

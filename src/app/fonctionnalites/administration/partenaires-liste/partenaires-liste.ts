import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { PartenairesListeService } from './partenaires-liste.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { Departement } from '../../../modeles/departement.model';
import { OPTIONS_TYPE_PARTENAIRE } from '../../../modeles/profil-partenaire.model';
import {
  FiltresPartenairesListe,
  OPTIONS_STATUT_PARTENAIRE_LISTE,
  PartenaireListe,
  StatutPartenaireListe,
  classeChipStatutPartenaireListe,
} from '../../../modeles/partenaire-liste.model';

// Délai de silence avant de relancer la recherche (filtrage backend).
const DEBOUNCE_RECHERCHE_MS = 350;

/**
 * Écran "Partenaires" (lecture seule, capacité voir_indicateurs) : liste
 * plate filtrable (recherche, type, statut, département — filtrage backend),
 * export CSV respectant les filtres courants, détail secondaire au clic sur
 * une ligne. Aucune action de modification.
 */
@Component({
  selector: 'app-partenaires-liste',
  imports: [],
  templateUrl: './partenaires-liste.html',
  styleUrl: './partenaires-liste.scss',
})
export class PartenairesListe implements OnInit {
  private readonly service = inject(PartenairesListeService);
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
    this.partenaireOuvertId.set(
      this.partenaireOuvertId() === partenaire.id ? null : partenaire.id,
    );
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

import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { ConnexionsAdminService } from './connexions-admin.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { ConnexionAdmin, FiltresConnexionsAdmin } from '../../../modeles/connexion-admin.model';

// Délai de silence avant de relancer le chargement (recherche + filtre jours, filtrage backend).
const DEBOUNCE_MS = 350;

/**
 * Écran "Connexions admin" (lecture seule, capacité lire_journal) : trace des
 * connexions des comptes admin, filtrable par recherche/période (filtrage
 * backend, débouncé), export CSV respectant les filtres courants. Aucune action.
 *
 * Le filtre `utilisateur` du contrat backend est supporté côté service, mais
 * pas exposé en sélecteur ici : aucun endpoint confirmé ne liste les comptes
 * admin avec leur id pour peupler un tel select sans l'inventer.
 */
@Component({
  selector: 'app-connexions-admin',
  imports: [],
  templateUrl: './connexions-admin.html',
  styleUrl: './connexions-admin.scss',
})
export class ConnexionsAdmin implements OnInit {
  private readonly service = inject(ConnexionsAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly connexions = signal<ConnexionAdmin[]>([]);
  readonly total = signal(0);

  readonly rechercheTexte = signal('');
  readonly joursInput = signal('');

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  private readonly declenchementSubject = new Subject<void>();

  // Tri défensif par date décroissante (le backend est déjà censé trier ainsi).
  readonly connexionsTriees = computed(() =>
    [...this.connexions()].sort(
      (a, b) => new Date(b.date_connexion).getTime() - new Date(a.date_connexion).getTime(),
    ),
  );

  ngOnInit(): void {
    this.charger();

    this.declenchementSubject
      .pipe(debounceTime(DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.charger());
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.lister(this.filtresActuels()).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.connexions.set(reponse.resultats);
        this.total.set(reponse.total);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private filtresActuels(): FiltresConnexionsAdmin {
    return {
      q: this.rechercheTexte(),
      jours: this.parseJours(),
    };
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.declenchementSubject.next();
  }

  changerJours(valeur: string): void {
    this.joursInput.set(valeur);
    this.declenchementSubject.next();
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

  formaterDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** N valide (entier positif) uniquement ; sinon undefined — on ignore sans bloquer. */
  private parseJours(): number | undefined {
    const brut = this.joursInput().trim();
    if (!brut) {
      return undefined;
    }
    const nombre = Number(brut);
    return Number.isInteger(nombre) && nombre > 0 ? nombre : undefined;
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { JournalAuditService } from './journal-audit.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { EntreeJournal } from '../../../modeles/entree-journal.model';

const TAILLE_PAGE = 25;

interface OptionAction {
  action: string;
  libelle: string;
}

/**
 * Écran "Journal d'audit" : historique des actions de modération, en lecture
 * seule (GET /administration/moderation/journal/), avec export CSV.
 * Filtrage/pagination entièrement côté client (l'endpoint n'en propose pas).
 */
@Component({
  selector: 'app-journal-audit',
  imports: [],
  templateUrl: './journal-audit.html',
  styleUrl: './journal-audit.scss',
})
export class JournalAudit implements OnInit {
  private readonly service = inject(JournalAuditService);
  private readonly permissionsService = inject(PermissionsService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly entrees = signal<EntreeJournal[]>([]);
  readonly total = signal(0);

  readonly exportEnCours = signal(false);
  readonly erreurExport = signal<string | null>(null);

  readonly rechercheTexte = signal('');
  readonly filtreAction = signal('');
  readonly pageCourante = signal(1);

  readonly peutExporter = computed(() => this.permissionsService.aLaCapacite('exporter_csv'));
  readonly infobulleExport = computed(() =>
    this.peutExporter() ? '' : "Vous n'avez pas la capacité exporter_csv.",
  );

  readonly listePlafonnee = computed(() => this.total() >= 200);

  private readonly entreesTriees = computed(() =>
    [...this.entrees()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  );

  readonly optionsAction = computed<OptionAction[]>(() => {
    const parAction = new Map<string, string>();
    for (const entree of this.entrees()) {
      if (!parAction.has(entree.action)) {
        parAction.set(entree.action, entree.action_libelle);
      }
    }
    return [...parAction.entries()]
      .map(([action, libelle]) => ({ action, libelle }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle));
  });

  readonly entreesFiltrees = computed<EntreeJournal[]>(() => {
    const recherche = this.rechercheTexte().trim().toLowerCase();
    const action = this.filtreAction();

    return this.entreesTriees().filter((entree) => {
      if (action && entree.action !== action) {
        return false;
      }
      if (!recherche) {
        return true;
      }
      return (
        entree.acteur.toLowerCase().includes(recherche) ||
        entree.cible.toLowerCase().includes(recherche) ||
        entree.action_libelle.toLowerCase().includes(recherche)
      );
    });
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.entreesFiltrees().length / TAILLE_PAGE)));

  readonly pageAffichee = computed(() => Math.min(this.pageCourante(), this.nombrePages()));

  readonly entreesPage = computed<EntreeJournal[]>(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.entreesFiltrees().slice(debut, debut + TAILLE_PAGE);
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.charger().subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.entrees.set(reponse.entrees);
        this.total.set(reponse.total);
        this.pageCourante.set(1);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  exporter(): void {
    if (!this.peutExporter() || this.exportEnCours()) {
      return;
    }
    this.exportEnCours.set(true);
    this.erreurExport.set(null);

    this.service.exporterCsv().subscribe({
      next: () => this.exportEnCours.set(false),
      error: (erreur: unknown) => {
        this.exportEnCours.set(false);
        this.erreurExport.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.pageCourante.set(1);
  }

  changerFiltreAction(valeur: string): void {
    this.filtreAction.set(valeur);
    this.pageCourante.set(1);
  }

  pagePrecedente(): void {
    if (this.pageAffichee() > 1) {
      this.pageCourante.set(this.pageAffichee() - 1);
    }
  }

  pageSuivante(): void {
    if (this.pageAffichee() < this.nombrePages()) {
      this.pageCourante.set(this.pageAffichee() + 1);
    }
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

  /** Date relative simple (à l'instant / il y a N min / il y a N h / il y a N j / date). */
  formaterDateRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

import { Component, computed, input, signal } from '@angular/core';

import { formaterNombre } from '../../tableau-de-bord-admin/palette-graphiques';
import { ProfilEngagement } from '../../../../modeles/engagement-clients.model';

const TAILLE_PAGE = 25;

type FiltreActivite = '' | 'actifs' | 'inactifs';

/**
 * Onglet "Liste des clients" : liste exhaustive des clients (profils d'engagement) avec
 * recherche, filtre actifs/inactifs et pagination côté client. Lecture seule ; les données
 * viennent du parent.
 */
@Component({
  selector: 'app-annuaire-clients',
  imports: [],
  templateUrl: './annuaire-clients.html',
  styleUrl: './annuaire-clients.scss',
})
export class AnnuaireClients {
  readonly clients = input<ProfilEngagement[] | null>(null);
  readonly erreur = input<string | null>(null);

  readonly formaterNombre = formaterNombre;

  readonly recherche = signal('');
  readonly filtreActivite = signal<FiltreActivite>('');
  private readonly pageCourante = signal(1);

  private readonly clientsFiltres = computed(() => {
    const texte = this.recherche().trim().toLowerCase();
    const activite = this.filtreActivite();
    return (this.clients() ?? [])
      .filter((c) => {
        if (activite === 'actifs' && !c.est_client_actif) return false;
        if (activite === 'inactifs' && c.est_client_actif) return false;
        return (
          !texte ||
          c.username.toLowerCase().includes(texte) ||
          c.telephone.toLowerCase().includes(texte)
        );
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  });

  readonly totalAffiche = computed(() => this.clientsFiltres().length);
  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.totalAffiche() / TAILLE_PAGE)));
  readonly pageAffichee = computed(() => Math.min(this.pageCourante(), this.nombrePages()));

  readonly clientsPage = computed(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.clientsFiltres().slice(debut, debut + TAILLE_PAGE);
  });

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
    this.pageCourante.set(1);
  }

  changerFiltreActivite(valeur: string): void {
    this.filtreActivite.set(valeur as FiltreActivite);
    this.pageCourante.set(1);
  }

  pagePrecedente(): void {
    this.pageCourante.set(Math.max(1, this.pageAffichee() - 1));
  }

  pageSuivante(): void {
    this.pageCourante.set(Math.min(this.nombrePages(), this.pageAffichee() + 1));
  }

  formaterDate(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
  }
}

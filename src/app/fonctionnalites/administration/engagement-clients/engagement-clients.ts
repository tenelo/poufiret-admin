import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

import { EngagementClientsService } from './engagement-clients.service';
import { Graphique } from '../../../partage/graphique/graphique';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { couleursGraphique, formaterNombre } from '../tableau-de-bord-admin/palette-graphiques';
import { EngagementClients, ProfilEngagement } from '../../../modeles/engagement-clients.model';

const TAILLE_PAGE = 25;
const NB_TOP_CATEGORIES = 10;

type ColonneTri =
  | 'username'
  | 'nb_articles_vus_mois'
  | 'nb_vues_catalogue_mois'
  | 'temps_cumule_secondes_mois'
  | 'derniere_activite';

/**
 * Écran "Engagement clients" : profils d'engagement des clients, en lecture
 * seule (GET /analytics/admin/engagement/). Filtrage/tri/pagination
 * entièrement côté client (réponse non paginée par le backend).
 */
@Component({
  selector: 'app-engagement-clients',
  imports: [Graphique],
  templateUrl: './engagement-clients.html',
  styleUrl: './engagement-clients.scss',
})
export class EngagementClientsComponent implements OnInit {
  private readonly service = inject(EngagementClientsService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly donnees = signal<EngagementClients | null>(null);

  readonly formaterNombre = formaterNombre;

  readonly rechercheTexte = signal('');
  readonly actifsSeulement = signal(false);
  readonly colonneTri = signal<ColonneTri>('temps_cumule_secondes_mois');
  readonly directionTri = signal<'asc' | 'desc'>('desc');
  readonly pageCourante = signal(1);

  readonly profilOuvertId = signal<number | null>(null);

  readonly optionsDonut: ChartConfiguration['options'] = {
    plugins: { legend: { position: 'bottom' } },
  };

  readonly optionsBarresHorizontales: ChartConfiguration['options'] = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  readonly tauxActifs = computed(() => {
    const d = this.donnees();
    if (!d || d.nb_profils === 0) {
      return 0;
    }
    return Math.round((d.nb_clients_actifs / d.nb_profils) * 100);
  });

  readonly donneesActifsDonut = computed<ChartConfiguration['data']>(() => {
    const d = this.donnees();
    const actifs = d?.nb_clients_actifs ?? 0;
    const inactifs = d ? d.nb_profils - d.nb_clients_actifs : 0;
    return {
      labels: ['Actifs', 'Inactifs'],
      datasets: [{ data: [actifs, inactifs], backgroundColor: ['#1B5E20', '#e5e7eb'] }],
    };
  });

  readonly donneesTopCategories = computed<ChartConfiguration['data']>(() => {
    const profils = this.donnees()?.profils ?? [];
    const totaux = new Map<string, number>();
    for (const profil of profils) {
      for (const [slug, count] of Object.entries(profil.categories_consultees)) {
        totaux.set(slug, (totaux.get(slug) ?? 0) + count);
      }
    }
    const entrees = [...totaux.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, NB_TOP_CATEGORIES);

    return {
      labels: entrees.map(([slug]) => slug),
      datasets: [
        {
          label: 'Consultations',
          data: entrees.map(([, valeur]) => valeur),
          backgroundColor: couleursGraphique(entrees.length),
        },
      ],
    };
  });

  private readonly profilsFiltres = computed<ProfilEngagement[]>(() => {
    const recherche = this.rechercheTexte().trim().toLowerCase();
    const seulementActifs = this.actifsSeulement();

    return (this.donnees()?.profils ?? []).filter((profil) => {
      if (seulementActifs && !profil.est_client_actif) {
        return false;
      }
      if (!recherche) {
        return true;
      }
      return (
        profil.username.toLowerCase().includes(recherche) ||
        profil.telephone.toLowerCase().includes(recherche)
      );
    });
  });

  readonly profilsTries = computed<ProfilEngagement[]>(() => {
    const colonne = this.colonneTri();
    const sens = this.directionTri() === 'asc' ? 1 : -1;

    return [...this.profilsFiltres()].sort((a, b) => {
      if (colonne === 'username') {
        return sens * a.username.localeCompare(b.username);
      }
      if (colonne === 'derniere_activite') {
        const ta = a.derniere_activite ? new Date(a.derniere_activite).getTime() : 0;
        const tb = b.derniere_activite ? new Date(b.derniere_activite).getTime() : 0;
        return sens * (ta - tb);
      }
      return sens * (a[colonne] - b[colonne]);
    });
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.profilsTries().length / TAILLE_PAGE)));
  readonly pageAffichee = computed(() => Math.min(this.pageCourante(), this.nombrePages()));

  readonly profilsPage = computed<ProfilEngagement[]>(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.profilsTries().slice(debut, debut + TAILLE_PAGE);
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.charger().subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
        this.pageCourante.set(1);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  trier(colonne: ColonneTri): void {
    if (this.colonneTri() === colonne) {
      this.directionTri.set(this.directionTri() === 'asc' ? 'desc' : 'asc');
    } else {
      this.colonneTri.set(colonne);
      this.directionTri.set('desc');
    }
    this.pageCourante.set(1);
  }

  changerRecherche(valeur: string): void {
    this.rechercheTexte.set(valeur);
    this.pageCourante.set(1);
  }

  basculerActifsSeulement(): void {
    this.actifsSeulement.update((v) => !v);
    this.pageCourante.set(1);
  }

  basculerDetail(profil: ProfilEngagement): void {
    this.profilOuvertId.set(this.profilOuvertId() === profil.utilisateur_id ? null : profil.utilisateur_id);
  }

  categoriesTriees(profil: ProfilEngagement): { slug: string; valeur: number }[] {
    return Object.entries(profil.categories_consultees)
      .map(([slug, valeur]) => ({ slug, valeur }))
      .sort((a, b) => b.valeur - a.valeur);
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

  /** Ex. 125 -> "2 min", 4000 -> "1 h 6 min", 30 -> "< 1 min". */
  formaterDuree(secondes: number): string {
    if (secondes < 60) {
      return '< 1 min';
    }
    const minutesTotales = Math.floor(secondes / 60);
    const heures = Math.floor(minutesTotales / 60);
    const minutes = minutesTotales % 60;
    if (heures === 0) {
      return `${minutes} min`;
    }
    return minutes === 0 ? `${heures} h` : `${heures} h ${minutes} min`;
  }

  /** Date relative simple (à l'instant / il y a N min / il y a N h / il y a N j / date), ou "—". */
  formaterDateRelative(iso: string | null): string {
    if (!iso) {
      return '—';
    }
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

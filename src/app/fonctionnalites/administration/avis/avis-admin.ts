import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AvisAdminService } from './avis-admin.service';
import { FiltresAvis } from './filtres-avis/filtres-avis';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { AvisAdmin, FILTRES_AVIS_DEFAUT, FiltresAvisAdmin, etoiles, partenaireOuLivreur } from '../../../modeles/avis-admin.model';

const TAILLE_PAGE = 20;

/**
 * Modération des avis clients (admin / super-admin, capacité gerer_avis) : liste filtrée/paginée,
 * masquage (motif obligatoire) et réaffichage. Même gabarit que les autres centres admin filtrés
 * (interventions, demandes de location), sans onglets ni panneau de détail — actions directement en
 * ligne, comme la liste des partenaires.
 */
@Component({
  selector: 'app-avis-admin',
  imports: [FiltresAvis],
  templateUrl: './avis-admin.html',
  styleUrl: './avis-admin.scss',
})
export class AvisAdminComponent implements OnInit {
  private readonly service = inject(AvisAdminService);

  readonly taillePage = TAILLE_PAGE;
  readonly etoiles = etoiles;
  readonly partenaireOuLivreur = partenaireOuLivreur;

  readonly filtres = signal<FiltresAvisAdmin>(FILTRES_AVIS_DEFAUT);

  readonly avis = signal<AvisAdmin[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / TAILLE_PAGE)));

  /** Types d'objet déjà vus dans la liste chargée : aucun contrat ne fixe les valeurs possibles,
   *  donc les options du filtre sont dérivées des données réelles (même principe que le filtre
   *  « Action » du journal d'audit). */
  readonly optionsObjetType = computed(() => [...new Set(this.avis().map((a) => a.objet_type))].sort());

  // ---- Commentaire tronqué, complet au clic (le survol passe par [title], natif) ----
  readonly commentaireDeplieId = signal<number | null>(null);

  // ---- Masquer (dialogue, motif obligatoire) ----
  readonly avisAMasquer = signal<AvisAdmin | null>(null);
  readonly motifMasquage = signal('');
  readonly masquageEnCours = signal(false);
  readonly erreurMasquage = signal<string | null>(null);
  readonly motifInvalide = computed(() => !this.motifMasquage().trim());

  // ---- Réafficher (action directe) ----
  readonly reaffichageEnCoursId = signal<number | null>(null);
  readonly erreurAction = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.lister(this.filtres(), this.page(), TAILLE_PAGE).subscribe({
      next: ({ avis, total }) => {
        this.chargementEnCours.set(false);
        this.avis.set(avis);
        this.total.set(total);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  rafraichir(): void {
    this.charger();
  }

  surFiltres(filtres: FiltresAvisAdmin): void {
    this.filtres.set(filtres);
    this.page.set(1);
    this.charger();
  }

  changerPage(page: number): void {
    this.page.set(page);
    this.charger();
  }

  basculerCommentaire(avis: AvisAdmin): void {
    this.commentaireDeplieId.set(this.commentaireDeplieId() === avis.id ? null : avis.id);
  }

  // ---- Masquer ----

  demanderMasquage(avis: AvisAdmin): void {
    this.erreurAction.set(null);
    this.avisAMasquer.set(avis);
    this.motifMasquage.set('');
    this.erreurMasquage.set(null);
  }

  annulerMasquage(): void {
    if (this.masquageEnCours()) return;
    this.avisAMasquer.set(null);
  }

  confirmerMasquage(): void {
    const avis = this.avisAMasquer();
    if (!avis || this.motifInvalide() || this.masquageEnCours()) return;

    this.masquageEnCours.set(true);
    this.erreurMasquage.set(null);

    this.service.masquer(avis.id, this.motifMasquage().trim()).subscribe({
      next: (avisMaj) => {
        this.masquageEnCours.set(false);
        this.avisAMasquer.set(null);
        this.remplacer(avisMaj);
      },
      error: (erreur: unknown) => {
        this.masquageEnCours.set(false);
        this.erreurMasquage.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Réafficher ----

  reafficher(avis: AvisAdmin): void {
    if (this.reaffichageEnCoursId()) return;
    this.reaffichageEnCoursId.set(avis.id);
    this.erreurAction.set(null);

    this.service.reafficher(avis.id).subscribe({
      next: (avisMaj) => {
        this.reaffichageEnCoursId.set(null);
        this.remplacer(avisMaj);
      },
      error: (erreur: unknown) => {
        this.reaffichageEnCoursId.set(null);
        this.erreurAction.set(extraireMessageErreur(erreur));
      },
    });
  }

  private remplacer(avisMaj: AvisAdmin): void {
    this.avis.update((liste) => liste.map((a) => (a.id === avisMaj.id ? avisMaj : a)));
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

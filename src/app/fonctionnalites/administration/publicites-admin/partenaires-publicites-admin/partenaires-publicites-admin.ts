import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';

import { PublicitesAdminService } from '../publicites-admin.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import {
  PaginationPublicitesAdmin,
  ChangementTriPublicitesAdmin,
} from '../pagination-publicites-admin/pagination-publicites-admin';
import {
  ChampTriPartenairePubliciteAdmin,
  FILTRES_PARTENAIRES_PUBLICITE_ADMIN_DEFAUT,
  FiltresPartenairesPubliciteAdmin,
  LIBELLES_STATUT_PUBLICITE_ADMIN,
  OPTIONS_TRI_PARTENAIRE_PUBLICITE_ADMIN,
  PartenairePubliciteAdmin,
  ReponseListePartenairesPubliciteAdmin,
  StatutPubliciteAdmin,
} from '../../../../modeles/publicites-admin.model';

const DELAI_RECHERCHE_MS = 350;

/**
 * Onglet « Par partenaire » : vue agrégée (GET /publicites/admin/partenaires/), triable et
 * paginée. Un clic sur une ligne ouvre l'onglet Campagnes filtré sur ce partenaire.
 */
@Component({
  selector: 'app-partenaires-publicites-admin',
  imports: [PaginationPublicitesAdmin],
  templateUrl: './partenaires-publicites-admin.html',
  styleUrl: './partenaires-publicites-admin.scss',
})
export class PartenairesPublicitesAdmin implements OnInit {
  private readonly service = inject(PublicitesAdminService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly reponse = signal<ReponseListePartenairesPubliciteAdmin | null>(null);

  readonly filtres = signal<FiltresPartenairesPubliciteAdmin>(FILTRES_PARTENAIRES_PUBLICITE_ADMIN_DEFAUT);
  readonly recherche = signal(FILTRES_PARTENAIRES_PUBLICITE_ADMIN_DEFAUT.recherche);

  readonly optionsTri = OPTIONS_TRI_PARTENAIRE_PUBLICITE_ADMIN;
  readonly libellesStatut: Record<StatutPubliciteAdmin, string> = LIBELLES_STATUT_PUBLICITE_ADMIN;

  private readonly saisieRecherche$ = new Subject<void>();

  constructor() {
    this.saisieRecherche$
      .pipe(debounceTime(DELAI_RECHERCHE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.filtres.update((f) => ({ ...f, recherche: this.recherche(), page: 1 }));
        this.charger();
      });
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);
    this.service.chargerPartenaires(this.filtres()).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        this.reponse.set(reponse);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  saisirRecherche(valeur: string): void {
    this.recherche.set(valeur);
    this.saisieRecherche$.next();
  }

  surTri(changement: ChangementTriPublicitesAdmin): void {
    this.filtres.update((f) => ({
      ...f,
      champTri: changement.champ as ChampTriPartenairePubliciteAdmin,
      triDescendant: changement.descendant,
      page: 1,
    }));
    this.charger();
  }

  surPageSize(taille: number): void {
    this.filtres.update((f) => ({ ...f, pageSize: taille, page: 1 }));
    this.charger();
  }

  surPage(page: number): void {
    this.filtres.update((f) => ({ ...f, page }));
    this.charger();
  }

  /** Clic sur une ligne : ouvre l'onglet Campagnes, filtré sur ce partenaire. */
  ouvrirPartenaire(partenaire: PartenairePubliciteAdmin): void {
    this.router.navigate(['/administration/publicites'], {
      queryParams: {
        statut: 'toutes',
        partenaire: partenaire.partenaire_id,
        partenaireNom: partenaire.nom_commerce,
      },
    });
  }

  statutsPresents(partenaire: PartenairePubliciteAdmin): StatutPubliciteAdmin[] {
    return Object.keys(partenaire.par_statut ?? {}) as StatutPubliciteAdmin[];
  }

  formaterDate(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

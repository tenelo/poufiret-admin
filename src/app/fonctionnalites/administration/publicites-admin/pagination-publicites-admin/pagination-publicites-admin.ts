import { Component, computed, input, output } from '@angular/core';

import { TAILLES_PAGE_PUBLICITES_ADMIN } from '../../../../modeles/publicites-admin.model';

export interface OptionTriPublicitesAdmin {
  valeur: string;
  libelle: string;
}

export interface ChangementTriPublicitesAdmin {
  champ: string;
  descendant: boolean;
}

/**
 * Barre de tri + pagination, réutilisée par la liste de campagnes (admin/liste/) et le tableau
 * « Par partenaire » (admin/partenaires/) : ne fait aucun appel réseau, émet les changements, le
 * parent interroge l'API et repasse la nouvelle réponse (count/page/pageSize) en entrée.
 */
@Component({
  selector: 'app-pagination-publicites-admin',
  imports: [],
  templateUrl: './pagination-publicites-admin.html',
  styleUrl: './pagination-publicites-admin.scss',
})
export class PaginationPublicitesAdmin {
  readonly optionsTri = input.required<OptionTriPublicitesAdmin[]>();
  readonly champTri = input.required<string>();
  readonly triDescendant = input.required<boolean>();
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly count = input.required<number>();

  readonly triChange = output<ChangementTriPublicitesAdmin>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly taillesPage = TAILLES_PAGE_PUBLICITES_ADMIN;

  readonly nbPages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize())));

  choisirChamp(champ: string): void {
    this.triChange.emit({ champ, descendant: this.triDescendant() });
  }

  basculerDirection(): void {
    this.triChange.emit({ champ: this.champTri(), descendant: !this.triDescendant() });
  }

  choisirTaillePage(valeur: string): void {
    this.pageSizeChange.emit(Number(valeur));
  }

  pagePrecedente(): void {
    if (this.page() > 1) {
      this.pageChange.emit(this.page() - 1);
    }
  }

  pageSuivante(): void {
    if (this.page() < this.nbPages()) {
      this.pageChange.emit(this.page() + 1);
    }
  }
}

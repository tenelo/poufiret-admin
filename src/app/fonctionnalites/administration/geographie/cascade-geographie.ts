import { computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GeographieService } from './geographie.service';
import { CHAMP_NOM_ETAPE, ETAPES_GEO, EtapeGeo, LigneGeo, OptionGeo } from '../../../modeles/geographie.model';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';

/**
 * État d'une cascade de listes déroulantes (ex. Région → Département → Localité),
 * partagé par la barre de filtres et par le formulaire en dialog : changer un
 * niveau réinitialise les suivants et recharge les options du niveau suivant.
 * Le dernier maillon est le parent direct.
 */
export class CascadeGeographie {
  readonly valeurs = signal<(number | null)[]>([]);
  readonly options = signal<OptionGeo[][]>([]);
  readonly erreur = signal<string | null>(null);

  /** Id du parent direct (dernier maillon), ou null tant qu'il n'est pas choisi. */
  readonly parentId = computed(() => this.valeurs()[this.etapes.length - 1] ?? null);

  constructor(
    private readonly service: GeographieService,
    readonly etapes: EtapeGeo[],
    // Présélectionne automatiquement l'unique option d'un niveau (formulaire de création).
    private readonly preselectionnerUnique = false,
  ) {
    this.valeurs.set(etapes.map(() => null));
    this.options.set(etapes.map(() => []));
  }

  libelle(index: number): string {
    return ETAPES_GEO[this.etapes[index]].libelle;
  }

  /** Charge les options du premier maillon (tous les suivants en dépendent). */
  demarrer(): void {
    this.chargerEtape(0);
  }

  /** Choisit une valeur pour un maillon ; réinitialise les suivants et recharge le suivant. */
  changer(index: number, valeur: number | null): void {
    this.valeurs.update((v) => v.map((x, i) => (i === index ? valeur : i > index ? null : x)));
    this.options.update((o) => o.map((x, i) => (i > index ? [] : x)));
    if (valeur !== null && index + 1 < this.etapes.length) {
      this.chargerEtape(index + 1);
    }
  }

  /**
   * Préremplit la cascade à partir des ancêtres d'une ligne existante : les
   * maillons intermédiaires sont retrouvés par leur nom (seuls les noms des
   * ancêtres sont renvoyés), le parent direct par son id.
   */
  async preremplir(ligne: LigneGeo): Promise<void> {
    let parent: { cle: EtapeGeo; id: number } | undefined;

    for (let i = 0; i < this.etapes.length; i++) {
      const cle = this.etapes[i];
      const estDernier = i === this.etapes.length - 1;

      let options: OptionGeo[];
      try {
        options = await firstValueFrom(this.service.options(ETAPES_GEO[cle].endpoint, parent));
      } catch (erreur) {
        this.erreur.set(extraireMessageErreur(erreur));
        return;
      }

      let id: number | null;
      if (estDernier) {
        id = ligne.parent_id;
        // Un parent désactivé n'est pas dans les options (actifs par défaut) : on le garde sélectionnable.
        if (!options.some((o) => o.id === id)) {
          options = [...options, { id, nom: ligne.parent_nom }];
        }
      } else {
        const nom = ligne[CHAMP_NOM_ETAPE[cle]];
        id = options.find((o) => o.nom === nom)?.id ?? null;
      }

      this.options.update((o) => o.map((x, j) => (j === i ? options : x)));
      this.valeurs.update((v) => v.map((x, j) => (j === i ? id : x)));

      if (id === null) {
        return;
      }
      parent = { cle, id };
    }
  }

  private chargerEtape(index: number): void {
    const cleParent = index > 0 ? this.etapes[index - 1] : null;
    const idParent = index > 0 ? this.valeurs()[index - 1] : null;
    const parent = cleParent && idParent !== null ? { cle: cleParent, id: idParent } : undefined;

    this.service.options(ETAPES_GEO[this.etapes[index]].endpoint, parent).subscribe({
      next: (options) => {
        // Réponse périmée (le parent a changé entre-temps) : on l'ignore.
        if (index > 0 && this.valeurs()[index - 1] !== idParent) {
          return;
        }
        this.options.update((o) => o.map((x, i) => (i === index ? options : x)));
        if (this.preselectionnerUnique && options.length === 1 && this.valeurs()[index] === null) {
          this.changer(index, options[0].id);
        }
      },
      error: (erreur: unknown) => this.erreur.set(extraireMessageErreur(erreur)),
    });
  }
}

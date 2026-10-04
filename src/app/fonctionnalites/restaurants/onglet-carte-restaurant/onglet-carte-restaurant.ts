import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';

import { RestaurantService, PrefixeRestaurant } from '../restaurant.service';
import { DialogPlatCarte } from './dialog-plat-carte/dialog-plat-carte';
import { extraireMessageErreur } from '../extraire-message-erreur';
import { PlatCarte, SectionCarte } from '../../../modeles/carte-restaurant.model';

interface SectionAvecPlats {
  section: SectionCarte;
  plats: PlatCarte[];
}

const ID_SANS_SECTION = -1;

/**
 * Carte du restaurant : sections ordonnables par glisser-déposer, plats par section (photo, nom,
 * prix, badge « Réservé aux menus », interrupteur Épuisé), dialog de création/édition d'un plat.
 */
@Component({
  selector: 'app-onglet-carte-restaurant',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, DialogPlatCarte],
  templateUrl: './onglet-carte-restaurant.html',
  styleUrl: './onglet-carte-restaurant.scss',
})
export class OngletCarteRestaurant implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly estAdmin = input(false);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly sections = signal<SectionCarte[]>([]);
  readonly plats = signal<PlatCarte[]>([]);
  readonly filtreReserves = signal(false);

  readonly messageErreur = signal<string | null>(null);

  // ---- Ajout de section ----
  readonly nouvelleSectionNom = signal('');
  readonly ajoutSectionEnCours = signal(false);

  // ---- Renommage / suppression de section ----
  readonly sectionEnEditionId = signal<number | null>(null);
  readonly nomEditionSection = signal('');
  readonly sectionASupprimer = signal<SectionCarte | null>(null);
  readonly suppressionSectionEnCours = signal(false);
  readonly erreurSuppressionSection = signal<string | null>(null);

  // ---- Dialog plat ----
  readonly dialogOuvert = signal(false);
  readonly platEnEdition = signal<PlatCarte | null>(null);
  readonly sectionPourNouveauPlat = signal<number | null>(null);
  readonly ordrePourNouveauPlat = signal(0);

  // ---- Suppression / épuisement d'un plat ----
  readonly platASupprimer = signal<PlatCarte | null>(null);
  readonly suppressionPlatEnCours = signal(false);
  readonly erreurSuppressionPlat = signal<string | null>(null);
  readonly epuisementEnCoursId = signal<number | null>(null);

  readonly sectionsOrdonnees = computed(() => [...this.sections()].sort((a, b) => a.ordre - b.ordre));

  readonly platsParSection = computed<SectionAvecPlats[]>(() => {
    const platsVisibles = this.filtreReserves() ? this.plats().filter((p) => p.est_reserve_aux_menus) : this.plats();
    const tri = (liste: PlatCarte[]) => [...liste].sort((a, b) => a.ordre - b.ordre);

    const groupes: SectionAvecPlats[] = this.sectionsOrdonnees().map((section) => ({
      section,
      plats: tri(platsVisibles.filter((p) => p.section_menu === section.id)),
    }));

    const sansSection = tri(platsVisibles.filter((p) => p.section_menu === null));
    if (sansSection.length > 0) {
      groupes.push({
        section: {
          id: ID_SANS_SECTION,
          partenaire: 0,
          nom: 'Sans section',
          description: null,
          icone: null,
          ordre: Number.MAX_SAFE_INTEGER,
          est_active: true,
          modifie_par_role: null,
          modifie_par_nom: null,
          modifie_le: null,
        },
        plats: sansSection,
      });
    }
    return groupes;
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    forkJoin({ sections: this.service.listerSections(this.prefixe()), plats: this.service.listerPlats(this.prefixe()) }).subscribe({
      next: ({ sections, plats }) => {
        this.chargementEnCours.set(false);
        this.sections.set(sections);
        this.plats.set(plats);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  basculerFiltreReserves(): void {
    this.filtreReserves.update((v) => !v);
  }

  // ---- Sections ----

  ajouterSection(): void {
    const nom = this.nouvelleSectionNom().trim();
    if (!nom || this.ajoutSectionEnCours()) return;

    this.ajoutSectionEnCours.set(true);
    this.messageErreur.set(null);

    this.service.creerSection(this.prefixe(), { nom, ordre: this.sections().length }).subscribe({
      next: (section) => {
        this.ajoutSectionEnCours.set(false);
        this.sections.update((liste) => [...liste, section]);
        this.nouvelleSectionNom.set('');
      },
      error: (erreur: unknown) => {
        this.ajoutSectionEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  commencerEditionSection(section: SectionCarte): void {
    this.sectionEnEditionId.set(section.id);
    this.nomEditionSection.set(section.nom);
  }

  annulerEditionSection(): void {
    this.sectionEnEditionId.set(null);
  }

  enregistrerNomSection(section: SectionCarte): void {
    const nom = this.nomEditionSection().trim();
    if (!nom) return;
    this.service.modifierSection(this.prefixe(), section.id, { nom }).subscribe({
      next: (sectionMaj) => {
        this.sections.update((liste) => liste.map((s) => (s.id === sectionMaj.id ? sectionMaj : s)));
        this.sectionEnEditionId.set(null);
      },
      error: (erreur: unknown) => this.messageErreur.set(extraireMessageErreur(erreur)),
    });
  }

  demanderSuppressionSection(section: SectionCarte): void {
    this.erreurSuppressionSection.set(null);
    this.sectionASupprimer.set(section);
  }

  annulerSuppressionSection(): void {
    this.sectionASupprimer.set(null);
  }

  confirmerSuppressionSection(): void {
    const section = this.sectionASupprimer();
    if (!section || this.suppressionSectionEnCours()) return;

    this.suppressionSectionEnCours.set(true);
    this.erreurSuppressionSection.set(null);

    this.service.supprimerSection(this.prefixe(), section.id).subscribe({
      next: () => {
        this.suppressionSectionEnCours.set(false);
        this.sectionASupprimer.set(null);
        this.sections.update((liste) => liste.filter((s) => s.id !== section.id));
        this.charger();
      },
      error: (erreur: unknown) => {
        this.suppressionSectionEnCours.set(false);
        this.erreurSuppressionSection.set(extraireMessageErreur(erreur));
      },
    });
  }

  surDepotSection(evenement: CdkDragDrop<SectionCarte[]>): void {
    if (evenement.previousIndex === evenement.currentIndex) return;

    const reordonnees = [...this.sectionsOrdonnees()];
    moveItemInArray(reordonnees, evenement.previousIndex, evenement.currentIndex);

    const aPatcher: { id: number; ordre: number }[] = [];
    const nouvelleListe = reordonnees.map((section, index) => {
      if (section.ordre === index) return section;
      aPatcher.push({ id: section.id, ordre: index });
      return { ...section, ordre: index };
    });

    this.sections.set(nouvelleListe);
    if (aPatcher.length === 0) return;

    forkJoin(aPatcher.map((p) => this.service.modifierSection(this.prefixe(), p.id, { ordre: p.ordre }))).subscribe({
      error: (erreur: unknown) => {
        this.messageErreur.set(extraireMessageErreur(erreur));
        this.charger();
      },
    });
  }

  // ---- Plats ----

  ouvrirCreationPlat(sectionId: number | null): void {
    const section = sectionId === ID_SANS_SECTION ? null : sectionId;
    this.platEnEdition.set(null);
    this.sectionPourNouveauPlat.set(section);
    // Place le nouveau plat à la fin de sa section, pour que l'ordre reste cohérent entre plats
    // (sans ce calcul, plusieurs créations dans la même section recevraient toutes "ordre: 0").
    this.ordrePourNouveauPlat.set(this.plats().filter((p) => p.section_menu === section).length);
    this.dialogOuvert.set(true);
  }

  ouvrirEditionPlat(plat: PlatCarte): void {
    this.platEnEdition.set(plat);
    this.dialogOuvert.set(true);
  }

  fermerDialogPlat(): void {
    this.dialogOuvert.set(false);
    this.platEnEdition.set(null);
    this.charger();
  }

  demanderSuppressionPlat(plat: PlatCarte): void {
    this.erreurSuppressionPlat.set(null);
    this.platASupprimer.set(plat);
  }

  annulerSuppressionPlat(): void {
    this.platASupprimer.set(null);
  }

  confirmerSuppressionPlat(): void {
    const plat = this.platASupprimer();
    if (!plat || this.suppressionPlatEnCours()) return;

    this.suppressionPlatEnCours.set(true);
    this.erreurSuppressionPlat.set(null);

    this.service.supprimerPlat(this.prefixe(), plat.id).subscribe({
      next: () => {
        this.suppressionPlatEnCours.set(false);
        this.platASupprimer.set(null);
        this.plats.update((liste) => liste.filter((p) => p.id !== plat.id));
      },
      error: (erreur: unknown) => {
        this.suppressionPlatEnCours.set(false);
        this.erreurSuppressionPlat.set(extraireMessageErreur(erreur));
      },
    });
  }

  /** Image principale d'un plat, dérivée des images imbriquées (pas de champ dédié côté API). */
  imagePrincipale(plat: PlatCarte): string | null {
    return plat.images.find((i) => i.est_principale)?.image ?? plat.images[0]?.image ?? null;
  }

  basculerEpuise(plat: PlatCarte): void {
    if (this.epuisementEnCoursId()) return;
    this.epuisementEnCoursId.set(plat.id);
    this.messageErreur.set(null);

    // est_epuise (lecture) et est_disponible sont deux notions distinctes : on bascule l'épuisement
    // réel, pas la disponibilité (éditée séparément dans le dialog du plat).
    this.service.basculerEpuise(this.prefixe(), plat.id, { epuise: !plat.est_epuise }).subscribe({
      next: (platMaj) => {
        this.epuisementEnCoursId.set(null);
        this.plats.update((liste) => liste.map((p) => (p.id === platMaj.id ? platMaj : p)));
      },
      error: (erreur: unknown) => {
        this.epuisementEnCoursId.set(null);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

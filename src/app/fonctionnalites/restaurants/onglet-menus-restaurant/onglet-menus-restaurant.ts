import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { RestaurantService, PrefixeRestaurant } from '../restaurant.service';
import { ContexteNouveauMenu, DialogMenuRestaurant } from './dialog-menu-restaurant/dialog-menu-restaurant';
import { extraireMessageErreur } from '../extraire-message-erreur';
import { JOURS_MENU, MenuRestaurant, OPTIONS_SERVICE_MENU, ServiceMenu } from '../../../modeles/menu-restaurant.model';
import { PlatCarte } from '../../../modeles/carte-restaurant.model';

const DUREE_MESSAGE_MS = 6000;

function dateDuJourIso(): string {
  const date = new Date();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Jour au format des MENUS (1 = lundi ... 7 = dimanche) pour une date AAAA-MM-JJ donnée. */
function jourMenuDeDate(iso: string): number {
  const jourJs = new Date(`${iso}T00:00:00`).getDay();
  return jourJs === 0 ? 7 : jourJs;
}

/**
 * Menus programmés : grille "Semaine type" (7 jours × 3 services), "Menus datés" (remplacent la
 * semaine type ce jour-là) et aperçu « Ce qui sera servi » pour une date choisie (menu daté, sinon
 * semaine type, sinon dernier menu publié) — calculé côté client à partir de la liste déjà chargée.
 */
@Component({
  selector: 'app-onglet-menus-restaurant',
  imports: [DialogMenuRestaurant],
  templateUrl: './onglet-menus-restaurant.html',
  styleUrl: './onglet-menus-restaurant.scss',
})
export class OngletMenusRestaurant implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly estAdmin = input(false);

  readonly joursMenu = JOURS_MENU;
  readonly optionsService = OPTIONS_SERVICE_MENU;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly menus = signal<MenuRestaurant[]>([]);
  readonly plats = signal<PlatCarte[]>([]);

  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Dialog menu ----
  readonly dialogOuvert = signal(false);
  readonly menuEnEdition = signal<MenuRestaurant | null>(null);
  readonly contexteNouveauMenu = signal<ContexteNouveauMenu | null>(null);

  // ---- Copier la semaine ----
  readonly copieConfirmationOuverte = signal(false);
  readonly copieEnCours = signal(false);
  readonly erreurCopie = signal<string | null>(null);

  // ---- Aperçu ----
  readonly dateApercu = signal(dateDuJourIso());

  readonly menusHebdomadaires = computed(() => this.menus().filter((m) => m.nature === 'hebdomadaire'));
  readonly menusDates = computed(() =>
    [...this.menus()].filter((m) => m.nature === 'date').sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
  );

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    forkJoin({ menus: this.service.listerMenus(this.prefixe()), plats: this.service.listerPlats(this.prefixe()) }).subscribe({
      next: ({ menus, plats }) => {
        this.chargementEnCours.set(false);
        this.menus.set(menus);
        this.plats.set(plats);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Grille Semaine type ----

  menuCase(jour: number, service: ServiceMenu): MenuRestaurant | null {
    return this.menusHebdomadaires().find((m) => m.jour_semaine === jour && m.service === service) ?? null;
  }

  ouvrirCase(jour: number, service: ServiceMenu): void {
    const existant = this.menuCase(jour, service);
    if (existant) {
      this.ouvrirEdition(existant);
    } else {
      this.contexteNouveauMenu.set({ nature: 'hebdomadaire', jourSemaine: jour, date: null, service });
      this.menuEnEdition.set(null);
      this.dialogOuvert.set(true);
    }
  }

  // ---- Menus datés ----

  ouvrirNouveauMenuDate(): void {
    this.contexteNouveauMenu.set({ nature: 'date', jourSemaine: null, date: '', service: 'midi' });
    this.menuEnEdition.set(null);
    this.dialogOuvert.set(true);
  }

  ouvrirEdition(menu: MenuRestaurant): void {
    this.menuEnEdition.set(menu);
    this.contexteNouveauMenu.set(null);
    this.dialogOuvert.set(true);
  }

  fermerDialog(): void {
    this.dialogOuvert.set(false);
    this.menuEnEdition.set(null);
    this.charger();
  }

  surDialogEnregistre(): void {
    this.afficherSucces('Menu enregistré.');
    this.charger();
  }

  surPlatCree(plat: PlatCarte): void {
    this.plats.update((liste) => [...liste, plat]);
  }

  // ---- Aperçu : ce qui sera servi ----

  menuDeLApercu(service: ServiceMenu): { menu: MenuRestaurant; origine: string } | null {
    const date = this.dateApercu();
    const jour = jourMenuDeDate(date);
    const menus = this.menus().filter((m) => m.service === service && m.publie);

    const date_ = menus.find((m) => m.nature === 'date' && m.date === date);
    if (date_) return { menu: date_, origine: 'Menu daté' };

    const hebdo = menus.find((m) => m.nature === 'hebdomadaire' && m.jour_semaine === jour);
    if (hebdo) return { menu: hebdo, origine: 'Semaine type' };

    const dernier = [...menus].sort((a, b) => (b.modifie_le ?? '').localeCompare(a.modifie_le ?? ''))[0];
    return dernier ? { menu: dernier, origine: 'Dernier menu publié (repli)' } : null;
  }

  // ---- Copier la semaine ----

  ouvrirCopieConfirmation(): void {
    this.erreurCopie.set(null);
    this.copieConfirmationOuverte.set(true);
  }

  annulerCopie(): void {
    this.copieConfirmationOuverte.set(false);
  }

  confirmerCopie(): void {
    if (this.copieEnCours()) return;
    this.copieEnCours.set(true);
    this.erreurCopie.set(null);

    this.service.copierSemaine(this.prefixe()).subscribe({
      next: () => {
        this.copieEnCours.set(false);
        this.copieConfirmationOuverte.set(false);
        this.afficherSucces('Semaine copiée.');
        this.charger();
      },
      error: (erreur: unknown) => {
        this.copieEnCours.set(false);
        this.erreurCopie.set(extraireMessageErreur(erreur));
      },
    });
  }

  private afficherSucces(message: string): void {
    this.messageSucces.set(message);
    this.messageErreur.set(null);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);
  }
}

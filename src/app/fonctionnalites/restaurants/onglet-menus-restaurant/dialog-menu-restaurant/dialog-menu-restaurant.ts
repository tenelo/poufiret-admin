import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { RestaurantService, PrefixeRestaurant } from '../../restaurant.service';
import { extraireMessageErreur } from '../../extraire-message-erreur';
import {
  JOURS_MENU,
  LigneMenu,
  MenuRestaurant,
  NatureMenu,
  OPTIONS_SERVICE_MENU,
  RequeteMenu,
  ServiceMenu,
} from '../../../../modeles/menu-restaurant.model';
import { PlatCarte } from '../../../../modeles/carte-restaurant.model';

type OngletDialogMenu = 'infos' | 'lignes';

export interface ContexteNouveauMenu {
  nature: NatureMenu;
  jourSemaine: number | null;
  date: string | null;
  service: ServiceMenu;
}

/**
 * Dialog de création/édition d'un menu programmé : service, heures, titre, heure limite, publié,
 * puis lignes (plats + prix du menu + stock), avec création rapide d'un plat « réservé aux menus »
 * sans quitter le dialog. Les lignes ne sont gérables qu'une fois le menu créé (même principe que
 * DialogPlatCarte) : le dialog bascule en mode édition dès l'enregistrement réussi.
 */
@Component({
  selector: 'app-dialog-menu-restaurant',
  imports: [],
  templateUrl: './dialog-menu-restaurant.html',
  styleUrl: './dialog-menu-restaurant.scss',
})
export class DialogMenuRestaurant implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly menu = input<MenuRestaurant | null>(null);
  readonly contexteNouveauMenu = input<ContexteNouveauMenu | null>(null);
  readonly plats = input.required<PlatCarte[]>();

  readonly ferme = output<void>();
  readonly enregistre = output<void>();
  /** Un plat réservé aux menus vient d'être créé depuis ce dialog : le parent met à jour sa liste de plats. */
  readonly platCree = output<PlatCarte>();

  readonly joursMenu = JOURS_MENU;
  readonly optionsService = OPTIONS_SERVICE_MENU;

  readonly ongletActif = signal<OngletDialogMenu>('infos');
  readonly menuCourant = signal<MenuRestaurant | null>(null);

  readonly nature = signal<NatureMenu>('hebdomadaire');
  readonly jourSemaine = signal(1);
  readonly date = signal('');
  readonly service_ = signal<ServiceMenu>('midi');
  readonly heureDebut = signal('11:00');
  readonly heureFin = signal('14:00');
  readonly titre = signal('');
  readonly heureLimite = signal('');
  readonly publie = signal(false);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  // ---- Lignes ----
  readonly lignes = signal<LigneMenu[]>([]);
  readonly platChoisiId = signal<number | ''>('');
  readonly prixLigne = signal('');
  readonly stockLigne = signal('');
  readonly erreurLignes = signal<string | null>(null);
  readonly ajoutLigneEnCours = signal(false);

  // ---- Création rapide d'un plat réservé aux menus ----
  readonly creationPlatOuverte = signal(false);
  readonly nouveauPlatNom = signal('');
  readonly nouveauPlatPrix = signal('');
  readonly creationPlatEnCours = signal(false);
  readonly erreurCreationPlat = signal<string | null>(null);

  // ---- Dupliquer ----
  readonly dupliquerOuvert = signal(false);
  readonly dupliquerVers = signal<'date' | 'jour'>('date');
  readonly dupliquerDate = signal('');
  readonly dupliquerJour = signal(1);
  readonly dupliquerEnCours = signal(false);
  readonly erreurDupliquer = signal<string | null>(null);

  ngOnInit(): void {
    const menu = this.menu();
    this.menuCourant.set(menu);
    if (menu) {
      this.appliquerMenu(menu);
    } else {
      const contexte = this.contexteNouveauMenu();
      if (contexte) {
        this.nature.set(contexte.nature);
        if (contexte.jourSemaine !== null) this.jourSemaine.set(contexte.jourSemaine);
        if (contexte.date !== null) this.date.set(contexte.date);
        this.service_.set(contexte.service);
      }
    }
  }

  private appliquerMenu(menu: MenuRestaurant): void {
    this.nature.set(menu.nature);
    this.jourSemaine.set(menu.jour_semaine ?? 1);
    this.date.set(menu.date ?? '');
    this.service_.set(menu.service);
    this.heureDebut.set(menu.heure_debut);
    this.heureFin.set(menu.heure_fin);
    this.titre.set(menu.titre ?? '');
    this.heureLimite.set(menu.heure_limite_commande ?? '');
    this.publie.set(menu.publie);
    this.lignes.set(menu.lignes);
  }

  changerOnglet(onglet: OngletDialogMenu): void {
    if (onglet === 'lignes' && !this.menuCourant()) return;
    this.ongletActif.set(onglet);
  }

  soumettre(): void {
    const erreurs: Record<string, string> = {};
    if (this.nature() === 'hebdomadaire' && !this.jourSemaine()) erreurs['jour_semaine'] = 'Choisissez un jour.';
    if (this.nature() === 'date' && !this.date()) erreurs['date'] = 'Choisissez une date.';
    if (!this.heureDebut()) erreurs['heure_debut'] = "L'heure de début est requise.";
    if (!this.heureFin()) erreurs['heure_fin'] = "L'heure de fin est requise.";
    this.erreursChamps.set(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    const donnees: RequeteMenu = {
      nature: this.nature(),
      jour_semaine: this.nature() === 'hebdomadaire' ? this.jourSemaine() : null,
      date: this.nature() === 'date' ? this.date() : null,
      service: this.service_(),
      heure_debut: this.heureDebut(),
      heure_fin: this.heureFin(),
      titre: this.titre().trim() || null,
      publie: this.publie(),
      heure_limite_commande: this.heureLimite() || null,
    };

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);

    const courant = this.menuCourant();
    const requete = courant
      ? this.service.modifierMenu(this.prefixe(), courant.id, donnees)
      : this.service.creerMenu(this.prefixe(), donnees);

    requete.subscribe({
      next: (menu) => {
        this.enregistrementEnCours.set(false);
        this.menuCourant.set(menu);
        this.lignes.set(menu.lignes);
        this.enregistre.emit();
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Lignes ----

  nomPlat(platId: number): string {
    return this.plats().find((p) => p.id === platId)?.nom ?? `Plat #${platId}`;
  }

  ajouterLigne(): void {
    const menu = this.menuCourant();
    const platId = this.platChoisiId();
    if (!menu || platId === '' || this.ajoutLigneEnCours()) return;

    this.ajoutLigneEnCours.set(true);
    this.erreurLignes.set(null);

    const prix = this.prixLigne().trim();
    const stock = this.stockLigne().trim();

    this.service
      .creerLigneMenu(this.prefixe(), {
        menu: menu.id,
        plat: Number(platId),
        prix_menu: prix === '' ? null : Number(prix),
        stock_initial: stock === '' ? null : Number(stock),
        ordre: this.lignes().length,
      })
      .subscribe({
        next: (ligne) => {
          this.ajoutLigneEnCours.set(false);
          this.lignes.update((liste) => [...liste, ligne]);
          this.platChoisiId.set('');
          this.prixLigne.set('');
          this.stockLigne.set('');
        },
        error: (erreur: unknown) => {
          this.ajoutLigneEnCours.set(false);
          this.erreurLignes.set(extraireMessageErreur(erreur));
        },
      });
  }

  supprimerLigne(ligneId: number): void {
    this.service.supprimerLigneMenu(this.prefixe(), ligneId).subscribe({
      next: () => this.lignes.update((liste) => liste.filter((l) => l.id !== ligneId)),
      error: (erreur: unknown) => this.erreurLignes.set(extraireMessageErreur(erreur)),
    });
  }

  // ---- Création rapide d'un plat réservé aux menus ----

  ouvrirCreationPlat(): void {
    this.erreurCreationPlat.set(null);
    this.nouveauPlatNom.set('');
    this.nouveauPlatPrix.set('');
    this.creationPlatOuverte.set(true);
  }

  annulerCreationPlat(): void {
    this.creationPlatOuverte.set(false);
  }

  creerPlatRapide(): void {
    const nom = this.nouveauPlatNom().trim();
    const prix = Number(this.nouveauPlatPrix());
    if (!nom || Number.isNaN(prix) || prix < 0 || this.creationPlatEnCours()) return;

    this.creationPlatEnCours.set(true);
    this.erreurCreationPlat.set(null);

    this.service
      .creerPlat(this.prefixe(), {
        nom,
        description: '',
        prix,
        section_menu: null,
        est_actif: true,
        est_disponible: true,
        est_reserve_aux_menus: true,
        ordre: 0,
      })
      .subscribe({
        next: (plat) => {
          this.creationPlatEnCours.set(false);
          this.creationPlatOuverte.set(false);
          this.platCree.emit(plat);
          this.platChoisiId.set(plat.id);
        },
        error: (erreur: unknown) => {
          this.creationPlatEnCours.set(false);
          this.erreurCreationPlat.set(extraireMessageErreur(erreur));
        },
      });
  }

  // ---- Dupliquer ----

  ouvrirDupliquer(): void {
    this.erreurDupliquer.set(null);
    this.dupliquerOuvert.set(true);
  }

  annulerDupliquer(): void {
    this.dupliquerOuvert.set(false);
  }

  confirmerDupliquer(): void {
    const menu = this.menuCourant();
    if (!menu || this.dupliquerEnCours()) return;

    this.dupliquerEnCours.set(true);
    this.erreurDupliquer.set(null);

    const donnees =
      this.dupliquerVers() === 'date' ? { vers_date: this.dupliquerDate() } : { vers_jour_semaine: this.dupliquerJour() };

    this.service.dupliquerMenu(this.prefixe(), menu.id, donnees).subscribe({
      next: () => {
        this.dupliquerEnCours.set(false);
        this.dupliquerOuvert.set(false);
        this.enregistre.emit();
        this.ferme.emit();
      },
      error: (erreur: unknown) => {
        this.dupliquerEnCours.set(false);
        this.erreurDupliquer.set(extraireMessageErreur(erreur));
      },
    });
  }
}

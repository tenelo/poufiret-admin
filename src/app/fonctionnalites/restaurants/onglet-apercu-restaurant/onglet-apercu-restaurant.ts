import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { RestaurantService, PrefixeRestaurant } from '../restaurant.service';
import { extraireMessageErreur } from '../extraire-message-erreur';
import { FicheRestaurant } from '../../../modeles/restaurant.model';
import { MenuRestaurant, OPTIONS_SERVICE_MENU, ServiceMenu } from '../../../modeles/menu-restaurant.model';
import { OngletRestaurant } from '../espace-restaurant/espace-restaurant';

const DUREE_MESSAGE_MS = 6000;

/** Jour de la semaine au format des MENUS (1 = lundi ... 7 = dimanche). */
function jourMenuAujourdhui(): number {
  const jourJs = new Date().getDay(); // 0 = dimanche ... 6 = samedi
  return jourJs === 0 ? 7 : jourJs;
}

function dateDuJourIso(): string {
  const date = new Date();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Aperçu de l'espace restaurant : statut, fermeture exceptionnelle, menu en vigueur aujourd'hui
 * par service (avec le stock restant de chaque plat) et raccourcis vers les autres onglets.
 */
@Component({
  selector: 'app-onglet-apercu-restaurant',
  imports: [],
  templateUrl: './onglet-apercu-restaurant.html',
  styleUrl: './onglet-apercu-restaurant.scss',
})
export class OngletApercuRestaurant implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly allerA = output<OngletRestaurant>();

  readonly optionsService = OPTIONS_SERVICE_MENU;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly fiche = signal<FicheRestaurant | null>(null);
  readonly menusDuJour = signal<MenuRestaurant[]>([]);

  // ---- Fermeture exceptionnelle ----
  readonly motifFermeture = signal('');
  readonly fermeJusquAu = signal('');
  readonly enregistrementFermetureEnCours = signal(false);
  readonly erreurFermeture = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.chargerFiche(this.prefixe()).subscribe({
      next: (fiche) => {
        this.chargementEnCours.set(false);
        this.appliquerFiche(fiche);
        this.chargerMenusDuJour();
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private appliquerFiche(fiche: FicheRestaurant): void {
    this.fiche.set(fiche);
    this.motifFermeture.set(fiche.motif_fermeture ?? '');
    this.fermeJusquAu.set(fiche.ferme_jusqu_au ?? '');
  }

  private chargerMenusDuJour(): void {
    this.service.listerMenus(this.prefixe(), { publie: true }).subscribe({
      next: (menus) => this.menusDuJour.set(menus),
      error: () => undefined,
    });
  }

  /** Faux si message_statut ne fait que répéter le libellé du badge (ex. "Fermé" / "Fermé"). */
  messageStatutDistinct(fiche: FicheRestaurant): boolean {
    const libelleBadge = fiche.est_ouvert ? 'ouvert' : 'fermé';
    return !!fiche.message_statut && fiche.message_statut.trim().toLowerCase() !== libelleBadge;
  }

  /** Vrai si aucun jour n'a d'horaire renseigné (horaires vides, ou tous fermés). */
  aucunHoraireRenseigne(fiche: FicheRestaurant): boolean {
    return fiche.horaires.length === 0 || fiche.horaires.every((jour) => !jour.ouvert);
  }

  /** Pour chaque service : le menu daté d'aujourd'hui, sinon le menu hebdomadaire du jour, sinon aucun. */
  menuDuService(service: ServiceMenu): MenuRestaurant | null {
    const aujourdhui = dateDuJourIso();
    const jour = jourMenuAujourdhui();
    const menus = this.menusDuJour().filter((m) => m.service === service);
    return (
      menus.find((m) => m.nature === 'date' && m.date === aujourdhui) ??
      menus.find((m) => m.nature === 'hebdomadaire' && m.jour_semaine === jour) ??
      null
    );
  }

  basculerFermeture(valeur: boolean): void {
    const fiche = this.fiche();
    if (!fiche || this.enregistrementFermetureEnCours()) {
      return;
    }
    this.enregistrerFermeture(valeur);
  }

  enregistrerFermeture(valeur = true): void {
    if (this.enregistrementFermetureEnCours()) {
      return;
    }
    this.enregistrementFermetureEnCours.set(true);
    this.erreurFermeture.set(null);

    this.service
      .modifierFiche(this.prefixe(), {
        ferme_exceptionnellement: valeur,
        motif_fermeture: valeur ? this.motifFermeture().trim() || null : null,
        ferme_jusqu_au: valeur ? this.fermeJusquAu() || null : null,
      })
      .subscribe({
        next: (fiche) => {
          this.enregistrementFermetureEnCours.set(false);
          this.appliquerFiche(fiche);
          this.afficherSucces(valeur ? 'Restaurant marqué fermé exceptionnellement.' : 'Fermeture exceptionnelle levée.');
        },
        error: (erreur: unknown) => {
          this.enregistrementFermetureEnCours.set(false);
          this.erreurFermeture.set(extraireMessageErreur(erreur));
        },
      });
  }

  private afficherSucces(message: string): void {
    this.messageSucces.set(message);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);
  }
}

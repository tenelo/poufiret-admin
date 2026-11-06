import { Component, OnInit, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { catchError, map, of } from 'rxjs';

import { RestaurantService, PrefixeRestaurant } from '../restaurant.service';
import { extraireMessageErreur } from '../extraire-message-erreur';
import { FicheRestaurant, HoraireJour, JOURS_HORAIRE } from '../../../modeles/restaurant.model';
import { MesCommandesService } from '../../partenaire/mes-commandes/mes-commandes.service';
import { MenuRestaurant, OPTIONS_SERVICE_MENU, ServiceMenu } from '../../../modeles/menu-restaurant.model';
import { OngletRestaurant } from '../espace-restaurant/espace-restaurant';
import { GABARIT_RESTAURANT_PAR_DEFAUT, Gabarit, pluriel } from '../../../modeles/gabarit.model';

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

/** Indicateurs du jour des gabarits sans menus (null = non disponible). */
interface IndicateursCatalogue {
  produits: number | null;
  epuises: number | null;
  commandesDuJour: number | null;
}

/**
 * Aperçu de l'espace établissement, selon le gabarit : statut ouvert/fermé et horaires de la
 * semaine pour tous ; pharmacie : « De garde jusqu'au … » ; gabarit avec menus : menu en vigueur
 * aujourd'hui par service ; sans menus : nombre de produits, de produits épuisés et de commandes
 * du jour. Raccourcis vers les autres onglets (« Gérer les menus » seulement avec menus).
 */
@Component({
  selector: 'app-onglet-apercu-restaurant',
  imports: [DatePipe],
  templateUrl: './onglet-apercu-restaurant.html',
  styleUrl: './onglet-apercu-restaurant.scss',
})
export class OngletApercuRestaurant implements OnInit {
  private readonly service = inject(RestaurantService);
  private readonly mesCommandesService = inject(MesCommandesService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  /** Gabarit de l'établissement : masque le menu du jour sans menus, nomme le catalogue. */
  readonly gabarit = input<Gabarit>(GABARIT_RESTAURANT_PAR_DEFAUT);
  readonly estAdmin = input(false);
  /** Admin : id du partenaire, pour lire ses commandes du jour dans la liste admin. */
  readonly partenaireId = input<number | null>(null);
  readonly libelleCatalogue = computed(() => pluriel(this.gabarit().libelle_produit).toLowerCase());
  readonly libelleCatalogueMajuscule = computed(() => pluriel(this.gabarit().libelle_produit));

  readonly joursHoraire = JOURS_HORAIRE;
  readonly indicateurs = signal<IndicateursCatalogue | null>(null);
  private readonly ficheChargee = signal(false);
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

  constructor() {
    // Menu du jour ou indicateurs selon le gabarit, relancés si le gabarit arrive après la fiche.
    effect(() => {
      const avecMenus = this.gabarit().menus_actifs;
      if (!this.ficheChargee()) return;
      untracked(() => (avecMenus ? this.chargerMenusDuJour() : this.chargerIndicateurs()));
    });
  }

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
        this.ficheChargee.set(true);
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

  /** Produits, produits épuisés (catalogue) et commandes du jour (liste admin, ou résumé partenaire). */
  private chargerIndicateurs(): void {
    this.indicateurs.set({ produits: null, epuises: null, commandesDuJour: null });
    this.service.listerPlats(this.prefixe()).subscribe({
      next: (plats) =>
        this.indicateurs.update((i) => ({
          commandesDuJour: i?.commandesDuJour ?? null,
          produits: plats.length,
          epuises: plats.filter((p) => p.est_epuise).length,
        })),
      error: () => undefined,
    });

    const commandes$ = this.estAdmin()
      ? this.service.listerRestaurantsAdmin().pipe(
          map((liste) => liste.find((e) => e.id === this.partenaireId())?.commandes_du_jour ?? null),
        )
      : this.mesCommandesService.resume().pipe(map((resume) => resume.total_aujourdhui));
    commandes$.pipe(catchError(() => of(null))).subscribe((nombre) =>
      this.indicateurs.update((i) => ({ produits: i?.produits ?? null, epuises: i?.epuises ?? null, commandesDuJour: nombre })),
    );
  }

  /** « 08:00 – 18:00 (pause 12:00 – 14:00) », ou « Fermé ». */
  horaireDuJour(fiche: FicheRestaurant, jour: number): string {
    const h: HoraireJour | undefined = fiche.horaires.find((x) => x.jour_semaine === jour);
    if (!h || !h.ouvert) return 'Fermé';
    const heure = (t: string | null) => (t ?? '').slice(0, 5) || '?';
    const plage = `${heure(h.heure_ouverture)} – ${heure(h.heure_fermeture)}`;
    return h.pause_debut && h.pause_fin ? `${plage} (pause ${heure(h.pause_debut)} – ${heure(h.pause_fin)})` : plage;
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
          this.afficherSucces(valeur ? 'Établissement marqué fermé exceptionnellement.' : 'Fermeture exceptionnelle levée.');
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

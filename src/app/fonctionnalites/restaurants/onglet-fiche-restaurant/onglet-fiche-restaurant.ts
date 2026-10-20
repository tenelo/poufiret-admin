import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { RestaurantService, PrefixeRestaurant } from '../restaurant.service';
import { extraireMessageErreur } from '../extraire-message-erreur';
import {
  FicheRestaurant,
  HoraireJour,
  JOURS_HORAIRE,
  OPTIONS_SERVICE_RESTAURANT,
  ServiceRestaurant,
  TelephoneRestaurant,
} from '../../../modeles/restaurant.model';
import { GABARIT_RESTAURANT_PAR_DEFAUT, Gabarit } from '../../../modeles/gabarit.model';

const DUREE_MESSAGE_MS = 6000;

/** ISO (UTC) → valeur d'un champ datetime-local, à l'heure locale ("AAAA-MM-JJTHH:MM"). */
function versDateHeureLocale(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}T${deux(date.getHours())}:${deux(date.getMinutes())}`;
}

function horaireVide(jour: number): HoraireJour {
  return {
    jour_semaine: jour,
    ouvert: false,
    heure_ouverture: null,
    heure_fermeture: null,
    pause_debut: null,
    pause_fin: null,
    note: null,
  };
}

/**
 * Fiche & horaires : les 7 jours d'ouverture, les téléphones, les services proposés, le délai de
 * préparation, les repères d'adresse, les réseaux sociaux et les spécialités ; pour une pharmacie
 * (gabarit "pharmacie"), la garde en cours (« De garde jusqu'au », effaçable).
 */
@Component({
  selector: 'app-onglet-fiche-restaurant',
  imports: [DatePipe],
  templateUrl: './onglet-fiche-restaurant.html',
  styleUrl: './onglet-fiche-restaurant.scss',
})
export class OngletFicheRestaurant implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly estAdmin = input(false);
  readonly gabarit = input<Gabarit>(GABARIT_RESTAURANT_PAR_DEFAUT);

  readonly joursHoraire = JOURS_HORAIRE;
  readonly optionsService = OPTIONS_SERVICE_RESTAURANT;

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly fiche = signal<FicheRestaurant | null>(null);

  readonly messageSucces = signal<string | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Horaires (édition locale des 7 jours, PUT global) ----
  readonly horaires = signal<HoraireJour[]>([]);
  readonly enregistrementHorairesEnCours = signal(false);
  readonly erreurHoraires = signal<string | null>(null);

  // ---- Téléphones ----
  readonly telephones = signal<TelephoneRestaurant[]>([]);
  readonly nouveauLibelle = signal('');
  readonly nouveauNumero = signal('');
  readonly ajoutTelephoneEnCours = signal(false);
  readonly erreurTelephones = signal<string | null>(null);
  readonly suppressionTelephoneEnCoursId = signal<number | null>(null);

  // ---- Infos (services, délai, adresse, réseaux, spécialités) ----
  readonly services = signal<Set<ServiceRestaurant>>(new Set());
  readonly delaiPreparation = signal('');
  readonly adresseReperes = signal('');
  readonly facebook = signal('');
  readonly instagram = signal('');
  readonly tiktok = signal('');
  readonly specialites = signal<string[]>([]);
  readonly nouvelleSpecialite = signal('');
  readonly enregistrementInfosEnCours = signal(false);
  readonly erreurInfos = signal<string | null>(null);

  // ---- Garde (pharmacie) ----
  readonly deGardeJusquAu = signal('');
  readonly enregistrementGardeEnCours = signal(false);
  readonly erreurGarde = signal<string | null>(null);

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
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  /**
   * Applique une fiche complète (GET fiche/, PATCH fiche/) : tous les champs, y compris les
   * horaires et téléphones imbriqués. Défensif sur chaque champ — une fiche partielle/inattendue
   * ne doit jamais faire planter l'écran (aucune lecture directe sur un champ potentiellement
   * undefined).
   */
  private appliquerFiche(fiche: FicheRestaurant): void {
    this.fiche.set(fiche);
    this.appliquerHoraires(fiche.horaires ?? []);
    this.telephones.set(fiche.telephones ?? []);
    this.services.set(new Set(fiche.services ?? []));
    this.delaiPreparation.set(
      fiche.delai_preparation_min !== null && fiche.delai_preparation_min !== undefined
        ? String(fiche.delai_preparation_min)
        : '',
    );
    this.adresseReperes.set(fiche.adresse_reperes ?? '');
    this.facebook.set(fiche.facebook ?? '');
    this.instagram.set(fiche.instagram ?? '');
    this.tiktok.set(fiche.tiktok ?? '');
    this.specialites.set([...(fiche.specialites ?? [])]);
    this.deGardeJusquAu.set(versDateHeureLocale(fiche.de_garde_jusqu_au));
  }

  /** Complète une liste d'horaires (potentiellement partielle) avec les 7 jours, dans l'ordre. */
  private appliquerHoraires(horaires: HoraireJour[]): void {
    this.horaires.set(this.joursHoraire.map((j) => horaires.find((h) => h.jour_semaine === j.valeur) ?? horaireVide(j.valeur)));
    // Garde la fiche en cache cohérente avec les horaires affichés (pas de modifie_le à jour ici :
    // PUT horaires/ ne renvoie que les horaires, pas la fiche — voir enregistrerHoraires).
    this.fiche.update((f) => (f ? { ...f, horaires } : f));
  }

  // ---- Horaires ----

  horaireJour(jour: number): HoraireJour {
    return this.horaires().find((h) => h.jour_semaine === jour) ?? horaireVide(jour);
  }

  majHoraire(jour: number, champ: keyof HoraireJour, valeur: string | boolean): void {
    this.horaires.update((liste) =>
      liste.map((h) => (h.jour_semaine === jour ? { ...h, [champ]: valeur === '' ? null : valeur } : h)),
    );
  }

  enregistrerHoraires(): void {
    if (this.enregistrementHorairesEnCours()) return;
    this.enregistrementHorairesEnCours.set(true);
    this.erreurHoraires.set(null);

    this.service.modifierHoraires(this.prefixe(), { horaires: this.horaires() }).subscribe({
      next: (horaires) => {
        this.enregistrementHorairesEnCours.set(false);
        // PUT horaires/ renvoie la liste brute des horaires (même forme que GET), pas la fiche
        // complète : ne JAMAIS passer cette réponse à appliquerFiche.
        this.appliquerHoraires(horaires);
        this.afficherSucces('Horaires enregistrés.');
      },
      error: (erreur: unknown) => {
        this.enregistrementHorairesEnCours.set(false);
        this.erreurHoraires.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Téléphones ----

  ajouterTelephone(): void {
    const libelle = this.nouveauLibelle().trim();
    const numero = this.nouveauNumero().trim();
    if (!libelle || !numero || this.ajoutTelephoneEnCours()) return;

    this.ajoutTelephoneEnCours.set(true);
    this.erreurTelephones.set(null);

    this.service.creerTelephone(this.prefixe(), { libelle, numero, ordre: this.telephones().length }).subscribe({
      next: (telephone) => {
        this.ajoutTelephoneEnCours.set(false);
        this.telephones.update((liste) => [...liste, telephone]);
        this.nouveauLibelle.set('');
        this.nouveauNumero.set('');
      },
      error: (erreur: unknown) => {
        this.ajoutTelephoneEnCours.set(false);
        this.erreurTelephones.set(extraireMessageErreur(erreur));
      },
    });
  }

  supprimerTelephone(telephone: TelephoneRestaurant): void {
    if (this.suppressionTelephoneEnCoursId()) return;
    this.suppressionTelephoneEnCoursId.set(telephone.id);
    this.erreurTelephones.set(null);

    this.service.supprimerTelephone(this.prefixe(), telephone.id).subscribe({
      next: () => {
        this.suppressionTelephoneEnCoursId.set(null);
        this.telephones.update((liste) => liste.filter((t) => t.id !== telephone.id));
      },
      error: (erreur: unknown) => {
        this.suppressionTelephoneEnCoursId.set(null);
        this.erreurTelephones.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Services, infos ----

  serviceCoche(service: ServiceRestaurant): boolean {
    return this.services().has(service);
  }

  basculerService(service: ServiceRestaurant, coche: boolean): void {
    this.services.update((ensemble) => {
      const copie = new Set(ensemble);
      if (coche) copie.add(service);
      else copie.delete(service);
      return copie;
    });
  }

  ajouterSpecialite(): void {
    const valeur = this.nouvelleSpecialite().trim();
    if (!valeur) return;
    this.specialites.update((liste) => (liste.includes(valeur) ? liste : [...liste, valeur]));
    this.nouvelleSpecialite.set('');
  }

  retirerSpecialite(valeur: string): void {
    this.specialites.update((liste) => liste.filter((s) => s !== valeur));
  }

  enregistrerInfos(): void {
    if (this.enregistrementInfosEnCours()) return;
    this.enregistrementInfosEnCours.set(true);
    this.erreurInfos.set(null);

    const delai = this.delaiPreparation().trim();

    this.service
      .modifierFiche(this.prefixe(), {
        services: [...this.services()],
        delai_preparation_min: delai === '' ? null : Number(delai),
        adresse_reperes: this.adresseReperes().trim() || null,
        facebook: this.facebook().trim() || null,
        instagram: this.instagram().trim() || null,
        tiktok: this.tiktok().trim() || null,
        specialites: this.specialites(),
      })
      .subscribe({
        next: (fiche) => {
          this.enregistrementInfosEnCours.set(false);
          this.appliquerFiche(fiche);
          this.afficherSucces('Informations enregistrées.');
        },
        error: (erreur: unknown) => {
          this.enregistrementInfosEnCours.set(false);
          this.erreurInfos.set(extraireMessageErreur(erreur));
        },
      });
  }

  // ---- Garde (pharmacie) ----

  /** Enregistre la fin de garde saisie, ou null pour l'effacer. */
  enregistrerGarde(effacer = false): void {
    if (this.enregistrementGardeEnCours()) return;
    const saisie = effacer ? '' : this.deGardeJusquAu();
    const date = saisie ? new Date(saisie) : null;
    if (date && Number.isNaN(date.getTime())) {
      this.erreurGarde.set('Date et heure invalides.');
      return;
    }
    this.enregistrementGardeEnCours.set(true);
    this.erreurGarde.set(null);
    this.service.modifierFiche(this.prefixe(), { de_garde_jusqu_au: date ? date.toISOString() : null }).subscribe({
      next: (fiche) => {
        this.enregistrementGardeEnCours.set(false);
        this.appliquerFiche(fiche);
        this.afficherSucces(date ? 'Garde enregistrée.' : 'Garde effacée.');
      },
      error: (erreur: unknown) => {
        this.enregistrementGardeEnCours.set(false);
        this.erreurGarde.set(extraireMessageErreur(erreur));
      },
    });
  }

  private afficherSucces(message: string): void {
    this.messageSucces.set(message);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);
  }
}

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';

import { ErreursFormulaire, extraireErreursFormulaire } from '../extraire-erreurs-champs';
import { FormulesPubAdminService } from '../formules-pub-admin.service';
import { extraireMessageErreur } from '../../../tableau-de-bord-admin/extraire-message-erreur';
import { ParametresPub } from '../../../../../modeles/formule-pub-admin.model';

const DUREE_MESSAGE_MS = 6000;

type CleNumerique = Exclude<
  keyof ParametresPub,
  'calcul_affluence_auto' | 'validation_auto'
>;

interface ChampNumerique {
  cle: CleNumerique;
  libelle: string;
  aide: string;
  min: number;
  max?: number;
}

/** Texte de saisie → entier, ou null si vide / non numérique / non entier. */
function versEntier(valeur: string): number | null {
  const texte = valeur.trim();
  if (texte === '') return null;
  const nombre = Number(texte);
  return Number.isInteger(nombre) ? nombre : null;
}

/**
 * Paramètres généraux de la publicité (GET/PATCH /publicites/admin/parametres/) : créneau
 * d'affluence, réglages de l'interstitiel, validation automatique. N'envoie que les champs
 * modifiés ; les 400 s'affichent sous les champs concernés.
 */
@Component({
  selector: 'app-parametres-pub',
  imports: [],
  templateUrl: './parametres-pub.html',
  styleUrl: './parametres-pub.scss',
})
export class ParametresPubComponent implements OnInit, OnDestroy {
  private readonly service = inject(FormulesPubAdminService);

  readonly champsAffluence: ChampNumerique[] = [
    {
      cle: 'affluence_debut',
      libelle: "Début du créneau d'affluence (heure)",
      aide: "Heure de début du créneau, utilisée uniquement si le calcul automatique est désactivé.",
      min: 0,
    },
    {
      cle: 'affluence_fin',
      libelle: "Fin du créneau d'affluence (heure)",
      aide: "Heure de fin du créneau, utilisée uniquement si le calcul automatique est désactivé.",
      min: 0,
    },
  ];

  readonly champsInterstitiel: ChampNumerique[] = [
    {
      cle: 'intervalle_min_interstitiel_secondes',
      libelle: "Intervalle minimum entre deux interstitiels (s)",
      aide: 'Délai minimum entre deux interstitiels pour un même utilisateur.',
      min: 0,
    },
    {
      cle: 'interstitiel_minute_min',
      libelle: 'Minute de session minimale',
      aide: "Minute de session à partir de laquelle l'interstitiel est servi (sessions longues).",
      min: 0,
    },
    {
      cle: 'interstitiel_minute_max',
      libelle: 'Minute de session maximale',
      aide: 'Borne haute : au-delà, retour à la minute nominale. Doit être supérieure ou égale à la minimale.',
      min: 0,
    },
    {
      cle: 'interstitiel_ratio_session_courte',
      libelle: 'Ratio pour les sessions courtes (%)',
      aide: "Pourcentage de la durée moyenne de session où servir l'interstitiel (sessions courtes), de 1 à 100.",
      min: 1,
      max: 100,
    },
  ];

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly enregistrementEnCours = signal(false);
  readonly messageSucces = signal<string | null>(null);
  readonly erreurs = signal<ErreursFormulaire | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // Dernières valeurs enregistrées (référence pour ne PATCHer que les champs modifiés).
  private readonly reference = signal<ParametresPub | null>(null);

  readonly calculAuto = signal(false);
  readonly validationAuto = signal(false);
  readonly valeurs = signal<Record<string, string>>({});
  private readonly erreursLocales = signal<Record<string, string>>({});

  readonly formulaireCharge = computed(() => this.reference() !== null);

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerMessage);
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.chargerParametres().subscribe({
      next: (parametres) => {
        this.chargementEnCours.set(false);
        this.appliquer(parametres);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  saisir(cle: string, valeur: string): void {
    this.valeurs.update((v) => ({ ...v, [cle]: valeur }));
  }

  erreur(champ: string): string | null {
    return this.erreursLocales()[champ] ?? this.erreurs()?.champs[champ] ?? null;
  }

  enregistrer(): void {
    const reference = this.reference();
    if (!reference || this.enregistrementEnCours()) {
      return;
    }

    const modifications: Partial<ParametresPub> = {};
    const erreursLocales: Record<string, string> = {};

    for (const champ of [...this.champsAffluence, ...this.champsInterstitiel]) {
      const valeur = versEntier(this.valeurs()[champ.cle] ?? '');
      if (valeur === null || valeur < champ.min || (champ.max !== undefined && valeur > champ.max)) {
        erreursLocales[champ.cle] =
          champ.max !== undefined
            ? `Saisissez un entier entre ${champ.min} et ${champ.max}.`
            : `Saisissez un entier supérieur ou égal à ${champ.min}.`;
      } else if (valeur !== reference[champ.cle]) {
        modifications[champ.cle] = valeur;
      }
    }
    if (this.calculAuto() !== reference.calcul_affluence_auto) {
      modifications.calcul_affluence_auto = this.calculAuto();
    }
    if (this.validationAuto() !== reference.validation_auto) {
      modifications.validation_auto = this.validationAuto();
    }

    this.erreursLocales.set(erreursLocales);
    this.erreurs.set(null);
    if (Object.keys(erreursLocales).length > 0) {
      return;
    }
    if (Object.keys(modifications).length === 0) {
      this.afficherSucces('Aucune modification à enregistrer.');
      return;
    }

    this.enregistrementEnCours.set(true);
    this.service.modifierParametres(modifications).subscribe({
      next: (parametres) => {
        this.enregistrementEnCours.set(false);
        this.appliquer(parametres);
        this.afficherSucces('Paramètres enregistrés.');
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.erreurs.set(
          extraireErreursFormulaire(erreur) ?? { champs: {}, general: extraireMessageErreur(erreur) },
        );
      },
    });
  }

  /** Remplit le formulaire depuis les paramètres du serveur et en fait la nouvelle référence. */
  private appliquer(parametres: ParametresPub): void {
    this.reference.set(parametres);
    this.calculAuto.set(parametres.calcul_affluence_auto);
    this.validationAuto.set(parametres.validation_auto);
    this.valeurs.set(
      Object.fromEntries(
        [...this.champsAffluence, ...this.champsInterstitiel].map((c) => [c.cle, String(parametres[c.cle])]),
      ),
    );
    this.erreursLocales.set({});
    this.erreurs.set(null);
  }

  private afficherSucces(message: string): void {
    this.messageSucces.set(message);
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.messageSucces.set(null), DUREE_MESSAGE_MS);
  }
}

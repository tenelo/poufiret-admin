import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RapprochementService } from './rapprochement.service';
import { GeographieService } from '../geographie.service';
import { DialogGeographie } from '../dialog-geographie/dialog-geographie';
import { LocaliteQuartierService } from '../../../../noyau/geo/localite-quartier.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { CorpsGeo, ErreursGeo, OptionGeo } from '../../../../modeles/geographie.model';
import {
  CompteursRapprochement,
  FiltreStatutRapprochement,
  LigneRapprochement,
  OptionRapprochementAvecScore,
  PropositionRapprochement,
} from '../../../../modeles/rapprochement-partenaire.model';

// Filtre affiché à l'écran ; "a_traiter" (défaut) n'est pas un statut backend : on
// interroge le backend avec "tous" puis on filtre les lignes proposition/aucun côté client.
type FiltreEcranRapprochement = 'a_traiter' | 'exact' | 'proposition' | 'aucun' | 'tous';

const DUREE_MESSAGE_MS = 4000;

/**
 * Onglet "Rapprochement" de Géographie (capacité gerer_geographie) : rattache les
 * partenaires n'ayant encore qu'un ancien texte libre (ville/quartier) à une
 * Localité et un Quartier de la géographie structurée, à partir des propositions
 * calculées par le backend (meilleur score présélectionné par défaut).
 */
@Component({
  selector: 'app-rapprochement',
  imports: [DialogGeographie, RouterLink],
  templateUrl: './rapprochement.html',
  styleUrl: './rapprochement.scss',
})
export class Rapprochement implements OnInit {
  private readonly service = inject(RapprochementService);
  private readonly geographieService = inject(GeographieService);
  private readonly localiteQuartierService = inject(LocaliteQuartierService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly lignes = signal<LigneRapprochement[]>([]);
  readonly compteurs = signal<CompteursRapprochement | null>(null);

  readonly filtre = signal<FiltreEcranRapprochement>('a_traiter');
  readonly optionsFiltre: { valeur: FiltreEcranRapprochement; libelle: string }[] = [
    { valeur: 'a_traiter', libelle: 'À traiter (proposition + aucun)' },
    { valeur: 'exact', libelle: 'Exact' },
    { valeur: 'proposition', libelle: 'Proposition' },
    { valeur: 'aucun', libelle: 'Aucun' },
    { valeur: 'tous', libelle: 'Tous' },
  ];

  // Sélection courante (localite_id, quartier_id) par partenaire_id, initialisée à la
  // meilleure proposition (ou au rattachement déjà existant).
  readonly selectionLocalite = signal<Record<number, number | ''>>({});
  readonly selectionQuartier = signal<Record<number, number | ''>>({});

  // Catalogue complet (propositions en tête, avec leur score, puis le reste du catalogue),
  // par partenaire_id : Localité = tout le département, Quartier = toute la localité choisie.
  readonly localitesParPartenaire = signal<Record<number, OptionRapprochementAvecScore[]>>({});
  readonly chargementLocalitesParPartenaire = signal<Record<number, boolean>>({});
  readonly erreurLocalitesParPartenaire = signal<Record<number, string | null>>({});

  readonly quartiersParPartenaire = signal<Record<number, OptionRapprochementAvecScore[]>>({});
  readonly chargementQuartiersParPartenaire = signal<Record<number, boolean>>({});
  readonly erreurQuartiersParPartenaire = signal<Record<number, string | null>>({});

  readonly validationEnCours = signal<number | null>(null);
  readonly erreurValidation = signal<{ id: number; message: string } | null>(null);

  readonly message = signal<{ texte: string; erreur: boolean } | null>(null);
  private timerMessage: ReturnType<typeof setTimeout> | undefined;

  // ---- Dialog "Ajouter ce quartier" (réutilise le formulaire de création de Géographie) ----
  readonly dialogQuartierOuvert = signal(false);
  readonly nomQuartierInitial = signal('');
  readonly enregistrementQuartierEnCours = signal(false);
  readonly erreursDialogQuartier = signal<ErreursGeo | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  changerFiltre(valeur: FiltreEcranRapprochement): void {
    this.filtre.set(valeur);
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    const filtreActuel = this.filtre();
    const statutBackend: FiltreStatutRapprochement = filtreActuel === 'a_traiter' ? 'tous' : filtreActuel;
    this.service.lister(statutBackend).subscribe({
      next: (reponse) => {
        this.chargementEnCours.set(false);
        const lignes =
          filtreActuel === 'a_traiter'
            ? reponse.resultats.filter((l) => l.statut === 'proposition' || l.statut === 'aucun')
            : reponse.resultats;
        this.lignes.set(lignes);
        this.compteurs.set(reponse.compteurs);
        this.initialiserSelections(lignes);

        this.localitesParPartenaire.set({});
        this.quartiersParPartenaire.set({});
        this.erreurLocalitesParPartenaire.set({});
        this.erreurQuartiersParPartenaire.set({});
        for (const ligne of lignes) {
          if (ligne.departement_id !== null) {
            this.chargerLocalitesPourLigne(ligne);
          }
        }
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private initialiserSelections(lignes: LigneRapprochement[]): void {
    const localites: Record<number, number | ''> = {};
    const quartiers: Record<number, number | ''> = {};
    for (const ligne of lignes) {
      localites[ligne.partenaire_id] =
        ligne.localite?.id ?? this.meilleureProposition(ligne.propositions.localites)?.id ?? '';
      quartiers[ligne.partenaire_id] =
        ligne.quartier?.id ?? this.meilleureProposition(ligne.propositions.quartiers)?.id ?? '';
    }
    this.selectionLocalite.set(localites);
    this.selectionQuartier.set(quartiers);
  }

  private meilleureProposition(propositions: PropositionRapprochement[]): PropositionRapprochement | undefined {
    return [...propositions].sort((a, b) => b.score - a.score)[0];
  }

  /** Propositions (avec score) en tête, puis le reste du catalogue complet, sans doublon. */
  private fusionnerPropositionsEtCatalogue(
    propositions: PropositionRapprochement[],
    catalogue: OptionGeo[],
  ): OptionRapprochementAvecScore[] {
    const idsPropositions = new Set(propositions.map((p) => p.id));
    const reste = catalogue.filter((o) => !idsPropositions.has(o.id));
    return [...propositions, ...reste];
  }

  private chargerLocalitesPourLigne(ligne: LigneRapprochement): void {
    if (ligne.departement_id === null) {
      return;
    }
    const id = ligne.partenaire_id;
    this.chargementLocalitesParPartenaire.update((s) => ({ ...s, [id]: true }));
    this.erreurLocalitesParPartenaire.update((s) => ({ ...s, [id]: null }));

    this.localiteQuartierService.listerLocalites(ligne.departement_id).subscribe({
      next: (catalogue) => {
        this.chargementLocalitesParPartenaire.update((s) => ({ ...s, [id]: false }));
        this.localitesParPartenaire.update((s) => ({
          ...s,
          [id]: this.fusionnerPropositionsEtCatalogue(ligne.propositions.localites, catalogue),
        }));

        // Si une localité est déjà sélectionnée (rattachement existant ou meilleure
        // proposition), on charge directement ses quartiers.
        const localiteSelectionnee = this.selectionLocalite()[id];
        if (localiteSelectionnee) {
          this.chargerQuartiersPourLigne(ligne, localiteSelectionnee);
        }
      },
      error: (erreur: unknown) => {
        this.chargementLocalitesParPartenaire.update((s) => ({ ...s, [id]: false }));
        this.erreurLocalitesParPartenaire.update((s) => ({ ...s, [id]: extraireMessageErreur(erreur) }));
      },
    });
  }

  private chargerQuartiersPourLigne(ligne: LigneRapprochement, localiteId: number): void {
    const id = ligne.partenaire_id;
    this.chargementQuartiersParPartenaire.update((s) => ({ ...s, [id]: true }));
    this.erreurQuartiersParPartenaire.update((s) => ({ ...s, [id]: null }));

    this.localiteQuartierService.listerQuartiers(localiteId).subscribe({
      next: (catalogue) => {
        this.chargementQuartiersParPartenaire.update((s) => ({ ...s, [id]: false }));
        this.quartiersParPartenaire.update((s) => ({
          ...s,
          [id]: this.fusionnerPropositionsEtCatalogue(ligne.propositions.quartiers, catalogue),
        }));
      },
      error: (erreur: unknown) => {
        this.chargementQuartiersParPartenaire.update((s) => ({ ...s, [id]: false }));
        this.erreurQuartiersParPartenaire.update((s) => ({ ...s, [id]: extraireMessageErreur(erreur) }));
      },
    });
  }

  /** Changer la localité réinitialise le quartier sélectionné, puis recharge ses quartiers. */
  changerLocaliteSelectionnee(ligne: LigneRapprochement, valeur: string): void {
    const id = ligne.partenaire_id;
    const localiteId = valeur ? Number(valeur) : '';
    this.selectionLocalite.update((s) => ({ ...s, [id]: localiteId }));
    this.selectionQuartier.update((s) => ({ ...s, [id]: '' }));
    this.quartiersParPartenaire.update((s) => ({ ...s, [id]: [] }));
    this.erreurQuartiersParPartenaire.update((s) => ({ ...s, [id]: null }));
    if (localiteId) {
      this.chargerQuartiersPourLigne(ligne, localiteId);
    }
  }

  changerQuartierSelectionne(partenaireId: number, valeur: string): void {
    this.selectionQuartier.update((s) => ({ ...s, [partenaireId]: valeur ? Number(valeur) : '' }));
  }

  peutValider(partenaireId: number): boolean {
    return this.selectionLocalite()[partenaireId] !== '' && this.selectionQuartier()[partenaireId] !== '';
  }

  /** Accesseurs dédiés (plutôt qu'un `?? []`/`?? null` inline dans le template) : le
   *  catalogue d'un partenaire est absent du Record tant que son chargement n'a pas
   *  abouti, même si le type de `Record` ne l'exprime pas explicitement. */
  localitesPour(partenaireId: number): OptionRapprochementAvecScore[] {
    return this.localitesParPartenaire()[partenaireId] ?? [];
  }

  quartiersPour(partenaireId: number): OptionRapprochementAvecScore[] {
    return this.quartiersParPartenaire()[partenaireId] ?? [];
  }

  valider(ligne: LigneRapprochement): void {
    const localiteId = this.selectionLocalite()[ligne.partenaire_id];
    const quartierId = this.selectionQuartier()[ligne.partenaire_id];
    if (!localiteId || !quartierId || this.validationEnCours() !== null) {
      return;
    }

    this.validationEnCours.set(ligne.partenaire_id);
    this.erreurValidation.set(null);

    this.service.valider(ligne.partenaire_id, { localite_id: localiteId, quartier_id: quartierId }).subscribe({
      next: () => {
        this.validationEnCours.set(null);
        this.afficherMessage(`« ${ligne.nom} » rapproché.`, false);
        this.charger();
      },
      error: (erreur: unknown) => {
        this.validationEnCours.set(null);
        this.erreurValidation.set({ id: ligne.partenaire_id, message: extraireMessageErreur(erreur) });
      },
    });
  }

  // ---- "Ajouter ce quartier" : réutilise le dialog de création de Géographie ----

  ouvrirAjoutQuartier(ligne: LigneRapprochement): void {
    this.nomQuartierInitial.set(ligne.quartier_texte);
    this.erreursDialogQuartier.set(null);
    this.dialogQuartierOuvert.set(true);
  }

  fermerAjoutQuartier(): void {
    this.dialogQuartierOuvert.set(false);
  }

  enregistrerQuartier(corps: CorpsGeo): void {
    if (this.enregistrementQuartierEnCours()) {
      return;
    }
    this.enregistrementQuartierEnCours.set(true);
    this.erreursDialogQuartier.set(null);

    this.geographieService.creer('quartiers', corps).subscribe({
      next: () => {
        this.enregistrementQuartierEnCours.set(false);
        this.dialogQuartierOuvert.set(false);
        this.afficherMessage('Quartier créé avec succès.', false);
        this.charger();
      },
      error: (erreur: unknown) => {
        this.enregistrementQuartierEnCours.set(false);
        this.erreursDialogQuartier.set({ nom: null, parent: null, general: extraireMessageErreur(erreur) });
      },
    });
  }

  private afficherMessage(texte: string, erreur: boolean): void {
    this.message.set({ texte, erreur });
    clearTimeout(this.timerMessage);
    this.timerMessage = setTimeout(() => this.message.set(null), DUREE_MESSAGE_MS);
  }
}

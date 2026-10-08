import { Component, signal } from '@angular/core';

import { RessourceBien } from '../../location.service';
import { DialogBienBase } from '../../partage-biens/dialog-bien-base';
import { PucesOptions } from '../../partage-biens/puces-options';
import { ReservationsConfirmees } from '../../partage-biens/reservations-confirmees';
import { SuppressionBien } from '../../partage-biens/suppression-bien';
import { LogementImages } from '../../onglet-logements/logement-images/logement-images';
import { LogementPanoramas } from '../../onglet-logements/logement-panoramas/logement-panoramas';
import { Hebergement, RequeteHebergement } from '../../../../modeles/hebergement.model';

type OngletDialogHebergement =
  | 'infos'
  | 'capacite'
  | 'tarifs'
  | 'unites'
  | 'equipements'
  | 'disponibilite'
  | 'photos'
  | 'visite';

const ONGLETS: { valeur: OngletDialogHebergement; libelle: string }[] = [
  { valeur: 'infos', libelle: 'Infos' },
  { valeur: 'capacite', libelle: 'Capacité & lits' },
  { valeur: 'tarifs', libelle: 'Tarifs' },
  { valeur: 'unites', libelle: 'Unités' },
  { valeur: 'equipements', libelle: 'Équipements' },
  { valeur: 'disponibilite', libelle: 'Disponibilité' },
  { valeur: 'photos', libelle: 'Photos' },
  { valeur: 'visite', libelle: 'Vue 360°' },
];

/**
 * Dialog de création/édition d'un hébergement (chambre, suite…), en sections (voir ONGLETS).
 * Logique commune : DialogBienBase ; photos et vue 360° : LogementImages / LogementPanoramas
 * (ressource « hebergements ») ; styles de DialogLogement.
 */
@Component({
  selector: 'app-dialog-hebergement',
  imports: [LogementImages, LogementPanoramas, PucesOptions, ReservationsConfirmees, SuppressionBien],
  templateUrl: './dialog-hebergement.html',
  styleUrls: ['../../onglet-logements/dialog-logement/dialog-logement.scss', '../../partage-biens/partage-biens.scss'],
})
export class DialogHebergement extends DialogBienBase<Hebergement, OngletDialogHebergement> {
  protected readonly ressource: RessourceBien = 'hebergements';
  protected readonly ongletParChamp: Record<string, OngletDialogHebergement> = {
    nom: 'infos',
    prix: 'tarifs',
    nb_unites: 'unites',
  };

  readonly onglets = ONGLETS;
  readonly ongletActif = signal<OngletDialogHebergement>('infos');

  // ---- Infos ----
  readonly typeHebergement = signal('');

  // ---- Capacité & lits ----
  readonly capaciteAdultes = signal('');
  readonly capaciteEnfants = signal('');
  readonly lits = signal('');
  readonly surfaceM2 = signal('');

  // ---- Tarifs ----
  readonly prixSemaine = signal('');
  readonly prixMois = signal('');
  readonly dureeMinNuits = signal('');

  // ---- Unités ----
  readonly nbUnites = signal('1');

  protected appliquer(h: Hebergement): void {
    this.typeHebergement.set(h.type_hebergement ?? '');
    this.capaciteAdultes.set(this.texte(h.capacite_adultes));
    this.capaciteEnfants.set(this.texte(h.capacite_enfants));
    this.lits.set(h.lits ?? '');
    this.surfaceM2.set(this.texte(h.surface_m2));
    this.prixSemaine.set(this.texte(h.prix_semaine));
    this.prixMois.set(this.texte(h.prix_mois));
    this.dureeMinNuits.set(this.texte(h.duree_min_nuits));
    this.nbUnites.set(this.texte(h.nb_unites));
    this.equipementsSelectionnes.set(new Set(h.equipements_hebergement ?? []));
  }

  protected override validerChamps(): Record<string, string> {
    const nb = this.nombreOuNull(this.nbUnites());
    if (nb !== null && nb < 1) {
      return { nb_unites: "Le nombre d'unités doit être d'au moins 1." };
    }
    return {};
  }

  protected construireRequete(): RequeteHebergement {
    return {
      type_hebergement: this.typeHebergement() || undefined,
      capacite_adultes: this.nombreOuNull(this.capaciteAdultes()),
      capacite_enfants: this.nombreOuNull(this.capaciteEnfants()),
      lits: this.lits().trim(),
      surface_m2: this.nombreOuNull(this.surfaceM2()),
      equipements_hebergement: [...this.equipementsSelectionnes()],
      prix_semaine: this.nombreOuNull(this.prixSemaine()),
      prix_mois: this.nombreOuNull(this.prixMois()),
      nb_unites: this.nombreOuNull(this.nbUnites()),
      duree_min_nuits: this.nombreOuNull(this.dureeMinNuits()),
    };
  }
}

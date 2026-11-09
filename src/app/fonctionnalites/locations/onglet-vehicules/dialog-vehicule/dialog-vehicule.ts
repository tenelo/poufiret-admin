import { Component, computed, signal } from '@angular/core';

import { RessourceBien } from '../../location.service';
import { DialogBienBase } from '../../partage-biens/dialog-bien-base';
import { PucesOptions } from '../../partage-biens/puces-options';
import { ReservationsConfirmees } from '../../partage-biens/reservations-confirmees';
import { SuppressionBien } from '../../partage-biens/suppression-bien';
import { LogementImages } from '../../onglet-logements/logement-images/logement-images';
import { LogementPanoramas } from '../../onglet-logements/logement-panoramas/logement-panoramas';
import { LocalisationLocation } from '../../localisation-location/localisation-location';
import { CoordonneesGps } from '../../../../partage/position-gps/position-gps';
import { estAVendre } from '../../formater-location';
import { erreurChamp } from '../../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { RequeteVehicule, Vehicule } from '../../../../modeles/vehicule.model';

type OngletDialogVehicule =
  | 'infos'
  | 'caracteristiques'
  | 'tarifs'
  | 'vente'
  | 'equipements'
  | 'disponibilite'
  | 'localisation'
  | 'photos'
  | 'visite';

const ONGLETS: { valeur: OngletDialogVehicule; libelle: string }[] = [
  { valeur: 'infos', libelle: 'Infos' },
  { valeur: 'caracteristiques', libelle: 'Caractéristiques' },
  { valeur: 'tarifs', libelle: 'Tarifs & conditions' },
  { valeur: 'vente', libelle: 'Vente' },
  { valeur: 'equipements', libelle: 'Équipements' },
  { valeur: 'disponibilite', libelle: 'Disponibilité' },
  { valeur: 'localisation', libelle: 'Point de prise en charge' },
  { valeur: 'photos', libelle: 'Photos' },
  { valeur: 'visite', libelle: 'Vue intérieure 360°' },
];

/**
 * Dialog de création/édition d'un véhicule, en sections (voir ONGLETS). Logique commune
 * (enregistrement, suppression / désactivation, sections Photos et Vue 360°) : DialogBienBase.
 * Réutilise LocalisationLocation (point de prise en charge), LogementImages et LogementPanoramas
 * (ressource « vehicules ») et les styles de DialogLogement.
 */
@Component({
  selector: 'app-dialog-vehicule',
  imports: [
    LogementImages,
    LogementPanoramas,
    LocalisationLocation,
    PucesOptions,
    ReservationsConfirmees,
    SuppressionBien,
  ],
  templateUrl: './dialog-vehicule.html',
  styleUrls: ['../../onglet-logements/dialog-logement/dialog-logement.scss', '../../partage-biens/partage-biens.scss'],
})
export class DialogVehicule extends DialogBienBase<Vehicule, OngletDialogVehicule> {
  protected readonly ressource: RessourceBien = 'vehicules';
  protected readonly ongletParChamp: Record<string, OngletDialogVehicule> = {
    nom: 'infos',
    prix: 'tarifs',
    prix_jour_avec_chauffeur: 'tarifs',
    prix_vente: 'vente',
  };

  readonly onglets = ONGLETS;
  readonly ongletActif = signal<OngletDialogVehicule>('infos');

  // ---- Infos ----
  readonly categorieVehicule = signal('');
  readonly marque = signal('');
  readonly modele = signal('');
  readonly annee = signal('');
  readonly couleur = signal('');

  // ---- Caractéristiques ----
  readonly nbPlaces = signal('');
  readonly boite = signal('');
  readonly carburant = signal('');
  readonly climatisation = signal(false);

  // ---- Tarifs & conditions ----
  readonly chauffeurDisponible = signal(false);
  readonly chauffeurObligatoire = signal(false);
  readonly prixJourAvecChauffeur = signal('');
  readonly caution = signal('');
  readonly kmInclusParJour = signal('');
  readonly prixKmSupplementaire = signal('');
  readonly carburantInclus = signal(false);
  readonly dureeMinJours = signal('');
  readonly zoneCirculation = signal('');

  // ---- Vente (apps.locations.vente) ----
  readonly mode = signal('location');
  readonly estEnVente = computed(() => estAVendre({ mode: this.mode() }));
  readonly estEnLocation = computed(() => this.mode() === 'location' || this.mode() === 'location_vente');
  readonly prixVente = signal('');
  readonly prixNegociable = signal(true);
  readonly etat = signal('');
  readonly kilometrage = signal('');
  readonly dedouane = signal(false);
  readonly carteGrise = signal(false);
  readonly visiteTechniqueValideJusquAu = signal('');
  readonly assuranceValideJusquAu = signal('');
  readonly nbProprietaires = signal('');

  // ---- Point de prise en charge (voir LocalisationLocation) ----
  readonly departementChoisi = signal('');
  readonly localiteId = signal('');
  readonly quartierId = signal('');
  readonly secteur = signal('');
  readonly adresseReperes = signal('');
  readonly positionChoisie = signal<CoordonneesGps | null>(null);

  protected appliquer(v: Vehicule): void {
    this.categorieVehicule.set(v.categorie_vehicule ?? '');
    this.marque.set(v.marque ?? '');
    this.modele.set(v.modele ?? '');
    this.annee.set(this.texte(v.annee));
    this.couleur.set(v.couleur ?? '');

    this.nbPlaces.set(this.texte(v.nb_places));
    this.boite.set(v.boite ?? '');
    this.carburant.set(v.carburant ?? '');
    this.climatisation.set(v.climatisation);

    this.chauffeurDisponible.set(v.chauffeur_disponible);
    this.chauffeurObligatoire.set(v.chauffeur_obligatoire);
    this.prixJourAvecChauffeur.set(this.texte(v.prix_jour_avec_chauffeur));
    this.caution.set(this.texte(v.caution));
    this.kmInclusParJour.set(this.texte(v.km_inclus_par_jour));
    this.prixKmSupplementaire.set(this.texte(v.prix_km_supplementaire));
    this.carburantInclus.set(v.carburant_inclus);
    this.dureeMinJours.set(this.texte(v.duree_min_jours));
    this.zoneCirculation.set(v.zone_circulation ?? '');

    this.equipementsSelectionnes.set(new Set(v.equipements));

    this.mode.set(v.mode || 'location');
    this.prixVente.set(this.texte(v.prix_vente));
    this.prixNegociable.set(v.prix_negociable);
    this.etat.set(v.etat ?? '');
    this.kilometrage.set(this.texte(v.kilometrage));
    this.dedouane.set(!!v.dedouane);
    this.carteGrise.set(!!v.carte_grise);
    this.visiteTechniqueValideJusquAu.set(v.visite_technique_valide_jusqu_au ?? '');
    this.assuranceValideJusquAu.set(v.assurance_valide_jusqu_au ?? '');
    this.nbProprietaires.set(this.texte(v.nb_proprietaires));

    this.departementChoisi.set(this.texte(v.departement_id));
    this.localiteId.set(this.texte(v.localite_id));
    this.quartierId.set(this.texte(v.quartier_id));
    this.secteur.set(v.secteur ?? '');
    this.adresseReperes.set(v.adresse_reperes ?? '');
  }

  changerChauffeurDisponible(valeur: boolean): void {
    this.chauffeurDisponible.set(valeur);
    if (!valeur) this.chauffeurObligatoire.set(false);
  }

  definirPosition(position: CoordonneesGps | null): void {
    this.positionChoisie.set(position);
  }

  protected override validerChamps(): Record<string, string> {
    const erreurs: Record<string, string> = {};
    if (this.chauffeurDisponible() && this.prixJourAvecChauffeur().trim() === '') {
      erreurs['prix_jour_avec_chauffeur'] = 'Indiquez le prix par jour avec chauffeur.';
    }
    if (this.estEnVente() && this.prixVente().trim() === '') {
      erreurs['prix_vente'] = 'Le prix de vente est requis pour une annonce à vendre.';
    }
    return erreurs;
  }

  /** Prix de location (onglet Tarifs) facultatif pour une annonce uniquement à vendre. */
  protected override prixRequis(): boolean {
    return this.estEnLocation();
  }

  protected override mapperErreurChamps(erreur: unknown): Record<string, string> | null {
    const erreurPrix = erreurChamp(erreur, 'prix');
    const erreurPrixVente = erreurChamp(erreur, 'prix_vente');
    if (!erreurPrix && !erreurPrixVente) return null;
    const champs: Record<string, string> = {};
    if (erreurPrix) champs['prix'] = erreurPrix;
    if (erreurPrixVente) champs['prix_vente'] = erreurPrixVente;
    return champs;
  }

  protected construireRequete(): RequeteVehicule {
    const donnees: RequeteVehicule = {
      categorie_vehicule: this.categorieVehicule() || undefined,
      marque: this.marque().trim(),
      modele: this.modele().trim(),
      annee: this.nombreOuNull(this.annee()),
      couleur: this.couleur().trim(),
      nb_places: this.nombreOuNull(this.nbPlaces()),
      boite: this.boite() || undefined,
      carburant: this.carburant() || undefined,
      climatisation: this.climatisation(),
      equipements: [...this.equipementsSelectionnes()],
      chauffeur_disponible: this.chauffeurDisponible(),
      chauffeur_obligatoire: this.chauffeurDisponible() && this.chauffeurObligatoire(),
      prix_jour_avec_chauffeur: this.chauffeurDisponible() ? this.nombreOuNull(this.prixJourAvecChauffeur()) : null,
      caution: this.nombreOuNull(this.caution()),
      km_inclus_par_jour: this.nombreOuNull(this.kmInclusParJour()),
      prix_km_supplementaire: this.nombreOuNull(this.prixKmSupplementaire()),
      carburant_inclus: this.carburantInclus(),
      duree_min_jours: this.nombreOuNull(this.dureeMinJours()),
      zone_circulation: this.zoneCirculation().trim(),
      localite_id: this.localiteId() ? Number(this.localiteId()) : null,
      quartier_id: this.quartierId() ? Number(this.quartierId()) : null,
      secteur: this.secteur().trim(),
      adresse_reperes: this.adresseReperes().trim(),
      mode: this.mode() || undefined,
      prix_vente: this.nombreOuNull(this.prixVente()),
      prix_negociable: this.prixNegociable(),
      etat: this.etat() || null,
      kilometrage: this.nombreOuNull(this.kilometrage()),
      dedouane: this.dedouane(),
      carte_grise: this.carteGrise(),
      visite_technique_valide_jusqu_au: this.visiteTechniqueValideJusquAu() || null,
      assurance_valide_jusqu_au: this.assuranceValideJusquAu() || null,
      nb_proprietaires: this.nombreOuNull(this.nbProprietaires()),
    };
    if (this.positionChoisie()) {
      donnees.latitude = this.positionChoisie()!.latitude;
      donnees.longitude = this.positionChoisie()!.longitude;
    }
    return donnees;
  }
}

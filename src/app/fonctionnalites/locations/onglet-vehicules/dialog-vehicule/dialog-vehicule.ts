import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { LocationService, PrefixeLocation } from '../../location.service';
import { LogementImages } from '../../onglet-logements/logement-images/logement-images';
import { LogementPanoramas } from '../../onglet-logements/logement-panoramas/logement-panoramas';
import { LocalisationLocation } from '../../localisation-location/localisation-location';
import { CoordonneesGps } from '../../../../partage/position-gps/position-gps';
import { extraireMessageErreur } from '../../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ReponseLocationMeta } from '../../../../modeles/location-meta.model';
import { OPTIONS_DISPONIBILITE_VEHICULE, RequeteVehicule, Vehicule } from '../../../../modeles/vehicule.model';

type OngletDialogVehicule =
  | 'infos'
  | 'caracteristiques'
  | 'tarifs'
  | 'equipements'
  | 'disponibilite'
  | 'localisation'
  | 'photos'
  | 'visite';

const ONGLETS: { valeur: OngletDialogVehicule; libelle: string }[] = [
  { valeur: 'infos', libelle: 'Infos' },
  { valeur: 'caracteristiques', libelle: 'Caractéristiques' },
  { valeur: 'tarifs', libelle: 'Tarifs & conditions' },
  { valeur: 'equipements', libelle: 'Équipements' },
  { valeur: 'disponibilite', libelle: 'Disponibilité' },
  { valeur: 'localisation', libelle: 'Point de prise en charge' },
  { valeur: 'photos', libelle: 'Photos' },
  { valeur: 'visite', libelle: 'Vue intérieure 360°' },
];

/**
 * Dialog de création/édition d'un véhicule, en sections (voir ONGLETS) — pendant de
 * DialogLogement, dont il reprend les styles et les composants : LocalisationLocation (point de
 * prise en charge), LogementImages et LogementPanoramas (ressource « vehicules »). Photos et vue
 * intérieure ne sont gérables qu'une fois le véhicule créé ; à la création, le dialog bascule en
 * mode édition sans se refermer. Suppression : 409 si le véhicule a des demandes → proposition de
 * le désactiver.
 */
@Component({
  selector: 'app-dialog-vehicule',
  imports: [LogementImages, LogementPanoramas, LocalisationLocation],
  templateUrl: './dialog-vehicule.html',
  styleUrls: ['../../onglet-logements/dialog-logement/dialog-logement.scss', './dialog-vehicule.scss'],
})
export class DialogVehicule implements OnInit {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();
  readonly vehicule = input<Vehicule | null>(null);
  readonly meta = input<ReponseLocationMeta | null>(null);

  readonly ferme = output<void>();

  readonly onglets = ONGLETS;
  readonly optionsDisponibilite = OPTIONS_DISPONIBILITE_VEHICULE;

  readonly ongletActif = signal<OngletDialogVehicule>('infos');
  readonly metaInterne = signal<ReponseLocationMeta | null>(null);
  readonly vehiculeCourant = signal<Vehicule | null>(null);

  // ---- Infos ----
  readonly nom = signal('');
  readonly categorieVehicule = signal('');
  readonly marque = signal('');
  readonly modele = signal('');
  readonly annee = signal('');
  readonly couleur = signal('');
  readonly description = signal('');
  readonly estActif = signal(true);

  // ---- Caractéristiques ----
  readonly nbPlaces = signal('');
  readonly boite = signal('');
  readonly carburant = signal('');
  readonly climatisation = signal(false);

  // ---- Tarifs & conditions ----
  readonly prix = signal('');
  readonly chauffeurDisponible = signal(false);
  readonly chauffeurObligatoire = signal(false);
  readonly prixJourAvecChauffeur = signal('');
  readonly caution = signal('');
  readonly kmInclusParJour = signal('');
  readonly prixKmSupplementaire = signal('');
  readonly carburantInclus = signal(false);
  readonly dureeMinJours = signal('');
  readonly zoneCirculation = signal('');

  // ---- Équipements ----
  readonly equipementsSelectionnes = signal<Set<string>>(new Set());

  // ---- Disponibilité ----
  readonly disponibilite = signal('disponible');

  // ---- Point de prise en charge (voir LocalisationLocation) ----
  readonly departementChoisi = signal('');
  readonly localiteId = signal('');
  readonly quartierId = signal('');
  readonly secteur = signal('');
  readonly adresseReperes = signal('');
  readonly positionChoisie = signal<CoordonneesGps | null>(null);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  // ---- Suppression ----
  readonly confirmationSuppression = signal(false);
  readonly suppressionEnCours = signal(false);
  /** Vrai après un 409 : le véhicule a des demandes, on propose de le désactiver. */
  readonly proposerDesactivation = signal(false);

  /** Réservations confirmées à venir (date de fin non dépassée), triées par date de début. */
  readonly reservationsAVenir = computed(() => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    return [...(this.vehiculeCourant()?.reservations_confirmees ?? [])]
      .filter((r) => r.date_fin >= aujourdhui)
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  });

  ngOnInit(): void {
    const meta = this.meta();
    if (meta) {
      this.metaInterne.set(meta);
    } else {
      this.service.meta().subscribe({
        next: (meta) => this.metaInterne.set(meta),
        error: () => undefined,
      });
    }

    const vehicule = this.vehicule();
    this.vehiculeCourant.set(vehicule);
    if (vehicule) {
      this.appliquerVehicule(vehicule);
    }
  }

  private appliquerVehicule(v: Vehicule): void {
    this.nom.set(v.nom);
    this.categorieVehicule.set(v.categorie_vehicule ?? '');
    this.marque.set(v.marque ?? '');
    this.modele.set(v.modele ?? '');
    this.annee.set(this.texte(v.annee));
    this.couleur.set(v.couleur ?? '');
    this.description.set(v.description ?? '');
    this.estActif.set(v.est_actif);

    this.nbPlaces.set(this.texte(v.nb_places));
    this.boite.set(v.boite ?? '');
    this.carburant.set(v.carburant ?? '');
    this.climatisation.set(v.climatisation);

    this.prix.set(String(v.prix));
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

    this.disponibilite.set(v.disponibilite || 'disponible');

    this.departementChoisi.set(this.texte(v.departement_id));
    this.localiteId.set(this.texte(v.localite_id));
    this.quartierId.set(this.texte(v.quartier_id));
    this.secteur.set(v.secteur ?? '');
    this.adresseReperes.set(v.adresse_reperes ?? '');
  }

  changerOnglet(onglet: OngletDialogVehicule): void {
    if ((onglet === 'photos' || onglet === 'visite') && !this.vehiculeCourant()) {
      return;
    }
    this.ongletActif.set(onglet);
  }

  basculerEquipement(valeur: string): void {
    this.equipementsSelectionnes.update((ensemble) => {
      const copie = new Set(ensemble);
      if (copie.has(valeur)) {
        copie.delete(valeur);
      } else {
        copie.add(valeur);
      }
      return copie;
    });
  }

  changerChauffeurDisponible(valeur: boolean): void {
    this.chauffeurDisponible.set(valeur);
    if (!valeur) this.chauffeurObligatoire.set(false);
  }

  definirPosition(position: CoordonneesGps | null): void {
    this.positionChoisie.set(position);
  }

  // ---- Enregistrement ----

  soumettre(): void {
    const prix = Number(this.prix());
    const erreurs: Record<string, string> = {};
    if (!this.nom().trim()) erreurs['nom'] = 'Le titre est requis.';
    if (this.prix().trim() === '' || Number.isNaN(prix) || prix < 0) {
      erreurs['prix'] = 'Le prix par jour doit être un nombre positif ou nul.';
    }
    if (this.chauffeurDisponible() && this.prixJourAvecChauffeur().trim() === '') {
      erreurs['prix_jour_avec_chauffeur'] = 'Indiquez le prix par jour avec chauffeur.';
    }
    this.erreursChamps.set(erreurs);
    if (Object.keys(erreurs).length > 0) {
      this.ongletActif.set(erreurs['nom'] ? 'infos' : 'tarifs');
      return;
    }

    const donnees: RequeteVehicule = {
      nom: this.nom().trim(),
      prix,
      description: this.description().trim(),
      est_actif: this.estActif(),
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
      disponibilite: this.disponibilite() || undefined,
      localite_id: this.localiteId() ? Number(this.localiteId()) : null,
      quartier_id: this.quartierId() ? Number(this.quartierId()) : null,
      secteur: this.secteur().trim(),
      adresse_reperes: this.adresseReperes().trim(),
    };
    if (this.positionChoisie()) {
      donnees.latitude = this.positionChoisie()!.latitude;
      donnees.longitude = this.positionChoisie()!.longitude;
    }

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);

    const courant = this.vehiculeCourant();
    const requete = courant
      ? this.service.modifierVehicule(this.prefixe(), courant.id, donnees)
      : this.service.creerVehicule(this.prefixe(), donnees);

    requete.subscribe({
      next: (vehicule) => {
        this.enregistrementEnCours.set(false);
        this.vehiculeCourant.set(vehicule);
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Suppression / désactivation ----

  demanderSuppression(): void {
    this.messageErreur.set(null);
    this.proposerDesactivation.set(false);
    this.confirmationSuppression.set(true);
  }

  annulerSuppression(): void {
    this.confirmationSuppression.set(false);
    this.proposerDesactivation.set(false);
  }

  supprimer(): void {
    const courant = this.vehiculeCourant();
    if (!courant || this.suppressionEnCours()) return;
    this.suppressionEnCours.set(true);
    this.messageErreur.set(null);

    this.service.supprimerVehicule(this.prefixe(), courant.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.ferme.emit();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
          this.proposerDesactivation.set(true);
          return;
        }
        this.confirmationSuppression.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  desactiver(): void {
    const courant = this.vehiculeCourant();
    if (!courant || this.suppressionEnCours()) return;
    this.suppressionEnCours.set(true);

    this.service.modifierVehicule(this.prefixe(), courant.id, { est_actif: false }).subscribe({
      next: (vehicule) => {
        this.suppressionEnCours.set(false);
        this.vehiculeCourant.set(vehicule);
        this.estActif.set(false);
        this.annulerSuppression();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.annulerSuppression();
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  private texte(valeur: number | null | undefined): string {
    return valeur !== null && valeur !== undefined ? String(valeur) : '';
  }

  private nombreOuNull(valeur: string): number | null {
    const texte = valeur.trim();
    if (!texte) return null;
    const nombre = Number(texte);
    return Number.isNaN(nombre) ? null : nombre;
  }
}

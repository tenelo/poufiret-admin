import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { LocationService, PrefixeLocation } from '../../location.service';
import { LogementImages } from '../logement-images/logement-images';
import { LogementPanoramas } from '../logement-panoramas/logement-panoramas';
import { LocalisationLocation } from '../../localisation-location/localisation-location';
import { PucesOptions, basculerDansEnsemble } from '../../partage-biens/puces-options';
import { CoordonneesGps } from '../../../../partage/position-gps/position-gps';
import { estAVendre } from '../../formater-location';
import { erreurChamp, extraireMessageErreur } from '../../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ReponseLocationMeta } from '../../../../modeles/location-meta.model';
import { Logement, RequeteLogement } from '../../../../modeles/logement.model';

type OngletDialogLogement =
  | 'infos'
  | 'caracteristiques'
  | 'conditions'
  | 'vente'
  | 'equipements'
  | 'disponibilite'
  | 'localisation'
  | 'photos'
  | 'visite';

const ONGLETS: { valeur: OngletDialogLogement; libelle: string }[] = [
  { valeur: 'infos', libelle: 'Infos' },
  { valeur: 'caracteristiques', libelle: 'Caractéristiques' },
  { valeur: 'conditions', libelle: 'Conditions' },
  { valeur: 'vente', libelle: 'Vente' },
  { valeur: 'equipements', libelle: 'Équipements' },
  { valeur: 'disponibilite', libelle: 'Disponibilité' },
  { valeur: 'localisation', libelle: 'Localisation' },
  { valeur: 'photos', libelle: 'Photos' },
  { valeur: 'visite', libelle: 'Visite immersive' },
];

/** Champs backend → onglet où les afficher (erreurs de validation). */
const ONGLET_PAR_CHAMP: Partial<Record<keyof RequeteLogement, OngletDialogLogement>> = {
  prix: 'conditions',
  prix_vente: 'vente',
};

/**
 * Dialog de création/édition d'un logement, en sections (voir ONGLETS) : la section
 * Localisation (cascade Département → Localité → Quartier, repères, position GPS) est le composant
 * LocalisationLocation, partagé avec DialogVehicule — préremplie en édition depuis
 * departement_id/localite_id/quartier_id. Photos et
 * visite immersive ne sont gérables qu'une fois le logement créé — en création, le dialog bascule
 * automatiquement en mode édition dès l'enregistrement réussi, sans se refermer (même principe que
 * DialogPlatCarte / DialogMenuRestaurant).
 */
@Component({
  selector: 'app-dialog-logement',
  imports: [LogementImages, LogementPanoramas, LocalisationLocation, PucesOptions],
  templateUrl: './dialog-logement.html',
  styleUrl: './dialog-logement.scss',
})
export class DialogLogement implements OnInit {
  private readonly service = inject(LocationService);

  readonly prefixe = input.required<PrefixeLocation>();
  readonly logement = input<Logement | null>(null);
  readonly meta = input<ReponseLocationMeta | null>(null);

  readonly ferme = output<void>();

  readonly ongletActif = signal<OngletDialogLogement>('infos');
  readonly metaInterne = signal<ReponseLocationMeta | null>(null);
  readonly logementCourant = signal<Logement | null>(null);

  // ---- Infos ----
  readonly nom = signal('');
  readonly description = signal('');
  readonly typeLogement = signal('');
  readonly estActif = signal(true);

  // ---- Caractéristiques ----
  readonly nbChambres = signal('');
  readonly nbSalons = signal('');
  readonly nbSallesDeBain = signal('');
  readonly surfaceM2 = signal('');
  readonly meuble = signal(false);

  // ---- Conditions ----
  readonly prix = signal('');
  readonly cautionMois = signal('');
  readonly avanceMois = signal('');
  readonly fraisAgence = signal('');
  readonly compteurEauIndividuel = signal(false);
  readonly compteurElectriciteIndividuel = signal(false);

  // ---- Vente (apps.locations.vente) ----
  readonly mode = signal('location');
  readonly estEnVente = computed(() => estAVendre({ mode: this.mode() }));
  readonly estEnLocation = computed(() => this.mode() === 'location' || this.mode() === 'location_vente');
  readonly prixVente = signal('');
  readonly prixNegociable = signal(true);
  readonly typeDocument = signal('');
  readonly surfaceTerrainM2 = signal('');
  readonly estLotie = signal(false);

  // ---- Équipements ----
  readonly equipementsSelectionnes = signal<Set<string>>(new Set());

  // ---- Disponibilité ----
  readonly disponibilite = signal('');
  readonly disponibleAPartirDu = signal('');

  // ---- Localisation (voir LocalisationLocation) ----
  readonly departementChoisi = signal('');
  readonly localiteId = signal('');
  readonly quartierId = signal('');
  readonly secteur = signal('');
  readonly adresseReperes = signal('');
  readonly positionChoisie = signal<CoordonneesGps | null>(null);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

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

    const logement = this.logement();
    this.logementCourant.set(logement);
    if (logement) {
      this.appliquerLogement(logement);
    }
  }

  private appliquerLogement(logement: Logement): void {
    this.nom.set(logement.nom);
    this.description.set(logement.description ?? '');
    this.typeLogement.set(logement.type_logement);
    this.estActif.set(logement.est_actif);

    this.nbChambres.set(logement.nb_chambres !== null ? String(logement.nb_chambres) : '');
    this.nbSalons.set(logement.nb_salons !== null ? String(logement.nb_salons) : '');
    this.nbSallesDeBain.set(logement.nb_salles_de_bain !== null ? String(logement.nb_salles_de_bain) : '');
    this.surfaceM2.set(logement.surface_m2 !== null ? String(logement.surface_m2) : '');
    this.meuble.set(logement.meuble);

    this.prix.set(String(logement.prix));
    this.cautionMois.set(logement.caution_mois !== null ? String(logement.caution_mois) : '');
    this.avanceMois.set(logement.avance_mois !== null ? String(logement.avance_mois) : '');
    this.fraisAgence.set(logement.frais_agence !== null ? String(logement.frais_agence) : '');
    this.compteurEauIndividuel.set(logement.compteur_eau_individuel);
    this.compteurElectriciteIndividuel.set(logement.compteur_electricite_individuel);

    this.mode.set(logement.mode || 'location');
    this.prixVente.set(logement.prix_vente !== null ? String(logement.prix_vente) : '');
    this.prixNegociable.set(logement.prix_negociable);
    this.typeDocument.set(logement.type_document ?? '');
    this.surfaceTerrainM2.set(logement.surface_terrain_m2 !== null ? String(logement.surface_terrain_m2) : '');
    this.estLotie.set(!!logement.est_lotie);

    this.equipementsSelectionnes.set(new Set(logement.equipements));

    this.disponibilite.set(logement.disponibilite);
    this.disponibleAPartirDu.set(logement.disponible_a_partir_du ?? '');

    this.departementChoisi.set(logement.departement_id !== null ? String(logement.departement_id) : '');
    this.localiteId.set(logement.localite_id !== null ? String(logement.localite_id) : '');
    this.quartierId.set(logement.quartier_id !== null ? String(logement.quartier_id) : '');
    this.secteur.set(logement.secteur ?? '');
    this.adresseReperes.set(logement.adresse_reperes ?? '');
  }

  changerOnglet(onglet: OngletDialogLogement): void {
    if ((onglet === 'photos' || onglet === 'visite') && !this.logementCourant()) {
      return;
    }
    this.ongletActif.set(onglet);
  }

  basculerEquipement(valeur: string): void {
    this.equipementsSelectionnes.update((ensemble) => basculerDansEnsemble(ensemble, valeur));
  }

  // ---- Localisation ----

  definirPosition(position: CoordonneesGps | null): void {
    this.positionChoisie.set(position);
  }

  // ---- Enregistrement ----

  soumettre(): void {
    const prixTexte = this.prix().trim();
    const prix = prixTexte === '' ? null : Number(prixTexte);
    const erreurs: Record<string, string> = {};
    if (!this.nom().trim()) erreurs['nom'] = 'Le nom est requis.';
    // Prix de location obligatoire seulement si l'annonce est (aussi) en location (voir estEnLocation).
    if (this.estEnLocation() && (prix === null || Number.isNaN(prix) || prix < 0)) {
      erreurs['prix'] = 'Le loyer mensuel doit être un nombre positif ou nul.';
    } else if (prix !== null && (Number.isNaN(prix) || prix < 0)) {
      erreurs['prix'] = 'Le loyer mensuel doit être un nombre positif ou nul.';
    }
    if (this.estEnVente() && this.prixVente().trim() === '') {
      erreurs['prix_vente'] = 'Le prix de vente est requis pour une annonce à vendre.';
    }
    this.erreursChamps.set(erreurs);
    const premierChamp = Object.keys(erreurs)[0] as keyof RequeteLogement | undefined;
    if (premierChamp) {
      const onglet = ONGLET_PAR_CHAMP[premierChamp];
      if (onglet) this.ongletActif.set(onglet);
      return;
    }

    const donnees: RequeteLogement = {
      nom: this.nom().trim(),
      prix,
      type_logement: this.typeLogement() || undefined,
      description: this.description().trim(),
      est_actif: this.estActif(),
      nb_chambres: this.nombreOuNull(this.nbChambres()),
      nb_salons: this.nombreOuNull(this.nbSalons()),
      nb_salles_de_bain: this.nombreOuNull(this.nbSallesDeBain()),
      surface_m2: this.nombreOuNull(this.surfaceM2()),
      meuble: this.meuble(),
      caution_mois: this.nombreOuNull(this.cautionMois()),
      avance_mois: this.nombreOuNull(this.avanceMois()),
      frais_agence: this.nombreOuNull(this.fraisAgence()),
      compteur_eau_individuel: this.compteurEauIndividuel(),
      compteur_electricite_individuel: this.compteurElectriciteIndividuel(),
      equipements: [...this.equipementsSelectionnes()],
      disponible_a_partir_du: this.disponibleAPartirDu() || null,
      localite_id: this.localiteId() ? Number(this.localiteId()) : null,
      quartier_id: this.quartierId() ? Number(this.quartierId()) : null,
      secteur: this.secteur().trim(),
      adresse_reperes: this.adresseReperes().trim(),
      mode: this.mode() || undefined,
      prix_vente: this.nombreOuNull(this.prixVente()),
      prix_negociable: this.prixNegociable(),
      type_document: this.typeDocument() || null,
      surface_terrain_m2: this.nombreOuNull(this.surfaceTerrainM2()),
      est_lotie: this.estLotie(),
    };
    if (this.disponibilite()) {
      // La disponibilité initiale suit le même champ que la mise à jour rapide côté liste.
      (donnees as RequeteLogement & { disponibilite?: string }).disponibilite = this.disponibilite();
    }
    if (this.positionChoisie()) {
      donnees.latitude = this.positionChoisie()!.latitude;
      donnees.longitude = this.positionChoisie()!.longitude;
    }

    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);

    const courant = this.logementCourant();
    const requete = courant
      ? this.service.modifierLogement(this.prefixe(), courant.id, donnees)
      : this.service.creerLogement(this.prefixe(), donnees);

    requete.subscribe({
      next: (logement) => {
        this.enregistrementEnCours.set(false);
        this.logementCourant.set(logement);
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        const erreurPrix = erreurChamp(erreur, 'prix');
        const erreurPrixVente = erreurChamp(erreur, 'prix_vente');
        if (erreurPrix || erreurPrixVente) {
          const champs: Record<string, string> = {};
          if (erreurPrix) champs['prix'] = erreurPrix;
          if (erreurPrixVente) champs['prix_vente'] = erreurPrixVente;
          this.erreursChamps.set(champs);
          this.ongletActif.set(erreurPrixVente ? 'vente' : 'conditions');
          return;
        }
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  private nombreOuNull(valeur: string): number | null {
    const texte = valeur.trim();
    if (!texte) return null;
    const nombre = Number(texte);
    return Number.isNaN(nombre) ? null : nombre;
  }
}

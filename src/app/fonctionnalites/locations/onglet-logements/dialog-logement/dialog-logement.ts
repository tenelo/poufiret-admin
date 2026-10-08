import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { LocationService, PrefixeLocation } from '../../location.service';
import { LogementImages } from '../logement-images/logement-images';
import { LogementPanoramas } from '../logement-panoramas/logement-panoramas';
import { LocalisationLocation } from '../../localisation-location/localisation-location';
import { PucesOptions, basculerDansEnsemble } from '../../partage-biens/puces-options';
import { CoordonneesGps } from '../../../../partage/position-gps/position-gps';
import { extraireMessageErreur } from '../../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { ReponseLocationMeta } from '../../../../modeles/location-meta.model';
import { Logement, RequeteLogement } from '../../../../modeles/logement.model';

type OngletDialogLogement =
  | 'infos'
  | 'caracteristiques'
  | 'conditions'
  | 'equipements'
  | 'disponibilite'
  | 'localisation'
  | 'photos'
  | 'visite';

const ONGLETS: { valeur: OngletDialogLogement; libelle: string }[] = [
  { valeur: 'infos', libelle: 'Infos' },
  { valeur: 'caracteristiques', libelle: 'Caractéristiques' },
  { valeur: 'conditions', libelle: 'Conditions' },
  { valeur: 'equipements', libelle: 'Équipements' },
  { valeur: 'disponibilite', libelle: 'Disponibilité' },
  { valeur: 'localisation', libelle: 'Localisation' },
  { valeur: 'photos', libelle: 'Photos' },
  { valeur: 'visite', libelle: 'Visite immersive' },
];

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
    const prix = Number(this.prix());
    const erreurs: Record<string, string> = {};
    if (!this.nom().trim()) erreurs['nom'] = 'Le nom est requis.';
    if (this.prix().trim() === '' || Number.isNaN(prix) || prix < 0) {
      erreurs['prix'] = 'Le loyer mensuel doit être un nombre positif ou nul.';
    }
    this.erreursChamps.set(erreurs);
    if (Object.keys(erreurs).length > 0) return;

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

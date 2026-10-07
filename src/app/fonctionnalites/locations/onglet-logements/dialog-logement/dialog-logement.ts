import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { LocationService, PrefixeLocation } from '../../location.service';
import { LogementImages } from '../logement-images/logement-images';
import { LogementPanoramas } from '../logement-panoramas/logement-panoramas';
import { LocaliteQuartierService } from '../../../../noyau/geo/localite-quartier.service';
import { CoordonneesGps, PositionGps } from '../../../../partage/position-gps/position-gps';
import { extraireMessageErreur } from '../../../administration/tableau-de-bord-admin/extraire-message-erreur';
import { Departement } from '../../../../modeles/departement.model';
import { OptionGeo } from '../../../../modeles/geographie.model';
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
 * Dialog de création/édition d'un logement, en sections (voir ONGLETS) : réutilise le composant
 * partagé de position GPS et la cascade Département → Localité → Quartier déjà utilisés pour les
 * partenaires — préremplie en édition depuis departement_id/localite_id/quartier_id. Photos et
 * visite immersive ne sont gérables qu'une fois le logement créé — en création, le dialog bascule
 * automatiquement en mode édition dès l'enregistrement réussi, sans se refermer (même principe que
 * DialogPlatCarte / DialogMenuRestaurant).
 */
@Component({
  selector: 'app-dialog-logement',
  imports: [LogementImages, LogementPanoramas, PositionGps],
  templateUrl: './dialog-logement.html',
  styleUrl: './dialog-logement.scss',
})
export class DialogLogement implements OnInit {
  private readonly service = inject(LocationService);
  private readonly localiteQuartierService = inject(LocaliteQuartierService);

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

  // ---- Localisation ----
  readonly departements = signal<Departement[]>([]);
  readonly departementChoisi = signal('');
  readonly localites = signal<OptionGeo[]>([]);
  readonly chargementLocalites = signal(false);
  readonly erreurLocalites = signal<string | null>(null);
  readonly localiteId = signal('');
  readonly quartiers = signal<OptionGeo[]>([]);
  readonly chargementQuartiers = signal(false);
  readonly erreurQuartiers = signal<string | null>(null);
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

    this.service.listerDepartements().subscribe({
      next: (departements) => this.departements.set(departements),
      error: () => undefined,
    });

    const logement = this.logement();
    this.logementCourant.set(logement);
    if (logement) {
      this.appliquerLogement(logement);
      this.preremplirLocalisation(logement);
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

  // ---- Localisation ----

  /** Préremplit la cascade depuis la fiche existante, sans réinitialiser localite_id/quartier_id. */
  private preremplirLocalisation(logement: Logement): void {
    if (!logement.departement_id) return;
    this.departementChoisi.set(String(logement.departement_id));
    this.chargementLocalites.set(true);
    this.localiteQuartierService.listerLocalites(logement.departement_id).subscribe({
      next: (localites) => {
        this.chargementLocalites.set(false);
        this.localites.set(localites);
      },
      error: (erreur: unknown) => {
        this.chargementLocalites.set(false);
        this.erreurLocalites.set(extraireMessageErreur(erreur));
      },
    });

    if (logement.localite_id) {
      this.chargementQuartiers.set(true);
      this.localiteQuartierService.listerQuartiers(logement.localite_id).subscribe({
        next: (quartiers) => {
          this.chargementQuartiers.set(false);
          this.quartiers.set(quartiers);
        },
        error: (erreur: unknown) => {
          this.chargementQuartiers.set(false);
          this.erreurQuartiers.set(extraireMessageErreur(erreur));
        },
      });
    }
  }

  changerDepartementChoisi(valeur: string): void {
    this.departementChoisi.set(valeur);
    this.localites.set([]);
    this.quartiers.set([]);
    this.localiteId.set('');
    this.quartierId.set('');
    this.erreurLocalites.set(null);
    if (valeur) {
      this.chargementLocalites.set(true);
      this.localiteQuartierService.listerLocalites(Number(valeur)).subscribe({
        next: (localites) => {
          this.chargementLocalites.set(false);
          this.localites.set(localites);
        },
        error: (erreur: unknown) => {
          this.chargementLocalites.set(false);
          this.erreurLocalites.set(extraireMessageErreur(erreur));
        },
      });
    }
  }

  changerLocaliteChoisie(valeur: string): void {
    this.localiteId.set(valeur);
    this.quartiers.set([]);
    this.quartierId.set('');
    this.erreurQuartiers.set(null);
    if (valeur) {
      this.chargementQuartiers.set(true);
      this.localiteQuartierService.listerQuartiers(Number(valeur)).subscribe({
        next: (quartiers) => {
          this.chargementQuartiers.set(false);
          this.quartiers.set(quartiers);
        },
        error: (erreur: unknown) => {
          this.chargementQuartiers.set(false);
          this.erreurQuartiers.set(extraireMessageErreur(erreur));
        },
      });
    }
  }

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

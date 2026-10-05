import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import {
  estHorsCoteDIvoire,
  extraireCoordonneesTexte,
  formaterMentionModificationPosition,
} from './coordonnees-texte';

export interface CoordonneesGps {
  latitude: number;
  longitude: number;
}

// Ferkessédougou (Côte d'Ivoire) : centre de repli en dernier recours, si ni la
// position existante ni le centre de secours (localité/département) ne sont connus.
const CENTRE_FERKESSEDOUGOU: L.LatLngTuple = [9.599, -5.1989];
const ZOOM_AVEC_POSITION = 15;
const ZOOM_SANS_POSITION = 7;
const SEUIL_PRECISION_METRES = 100;
const DELAI_GEOLOCALISATION_MS = 10000;

const ATTRIBUTION_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Composant partagé "Position du commerce" : carte Leaflet (clic pour placer,
 * repère déplaçable), géolocalisation navigateur, collage d'un lien Google Maps ou
 * de coordonnées. Composant contrôlé : affiche `latitude`/`longitude`, émet la
 * nouvelle position (ou `null` après "Effacer") sur "Enregistrer" — chaque écran
 * appelant gère lui-même l'appel réseau de sauvegarde (endpoint différent selon
 * le contexte : partenaire, création admin, fiche admin).
 */
@Component({
  selector: 'app-position-gps',
  imports: [],
  templateUrl: './position-gps.html',
  styleUrl: './position-gps.scss',
})
export class PositionGps implements AfterViewInit, OnDestroy {
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  /** Centre de repli si aucune position n'existe encore (ex. localité/département du partenaire). */
  readonly centreSecours = input<CoordonneesGps | null>(null);
  readonly modifieeLe = input<string | null>(null);
  /** 'admin' ou 'partenaire' — pilote la mention "Modifiée par…". */
  readonly modifieeParRole = input<string | null>(null);
  readonly enregistrementEnCours = input(false);
  readonly erreur = input<string | null>(null);

  /** Émis sur "Enregistrer" : la position courante, ou `null` après "Effacer". */
  readonly enregistrer = output<CoordonneesGps | null>();

  private readonly conteneurCarte = viewChild.required<ElementRef<HTMLDivElement>>('conteneurCarte');

  private carte: L.Map | null = null;
  private marqueur: L.Marker | null = null;

  readonly brouillon = signal<CoordonneesGps | null>(null);
  readonly texteCollage = signal('');
  readonly erreurCollage = signal<string | null>(null);

  readonly geolocalisationEnCours = signal(false);
  readonly erreurGeolocalisation = signal<string | null>(null);
  readonly avertissementPrecision = signal<string | null>(null);

  readonly horsCoteDIvoire = computed(() => {
    const position = this.brouillon();
    return position !== null && estHorsCoteDIvoire(position.latitude, position.longitude);
  });

  readonly mentionModification = computed(() =>
    formaterMentionModificationPosition(this.modifieeLe(), this.modifieeParRole()),
  );

  ngAfterViewInit(): void {
    const positionInitiale =
      this.latitude() !== null && this.longitude() !== null
        ? { latitude: this.latitude()!, longitude: this.longitude()! }
        : null;
    this.brouillon.set(positionInitiale);

    const secours = this.centreSecours();
    const centreInitial: L.LatLngTuple = positionInitiale
      ? [positionInitiale.latitude, positionInitiale.longitude]
      : secours
        ? [secours.latitude, secours.longitude]
        : CENTRE_FERKESSEDOUGOU;

    this.carte = L.map(this.conteneurCarte().nativeElement, { zoomControl: true }).setView(
      centreInitial,
      positionInitiale ? ZOOM_AVEC_POSITION : ZOOM_SANS_POSITION,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ATTRIBUTION_OSM,
      maxZoom: 19,
    }).addTo(this.carte);

    if (positionInitiale) {
      this.poserMarqueur(positionInitiale);
    }

    this.carte.on('click', (evenement: L.LeafletMouseEvent) => {
      this.definirPosition({ latitude: evenement.latlng.lat, longitude: evenement.latlng.lng }, false);
    });
  }

  ngOnDestroy(): void {
    this.carte?.remove();
    this.carte = null;
  }

  utiliserMaPosition(): void {
    if (!('geolocation' in navigator)) {
      this.erreurGeolocalisation.set("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    this.geolocalisationEnCours.set(true);
    this.erreurGeolocalisation.set(null);
    this.avertissementPrecision.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.geolocalisationEnCours.set(false);
        this.definirPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        if (position.coords.accuracy > SEUIL_PRECISION_METRES) {
          this.avertissementPrecision.set(
            `Position approximative (précision ±${Math.round(position.coords.accuracy)} m — ` +
              'ordinateur ou signal faible) — ajustez le repère sur la carte.',
          );
        }
      },
      (erreur) => {
        this.geolocalisationEnCours.set(false);
        this.erreurGeolocalisation.set(
          erreur.code === erreur.PERMISSION_DENIED
            ? 'Autorisation de localisation refusée. Autorisez la géolocalisation dans votre ' +
                'navigateur, ou placez le repère manuellement sur la carte.'
            : "Impossible d'obtenir votre position. Placez le repère manuellement sur la carte.",
        );
      },
      { enableHighAccuracy: true, timeout: DELAI_GEOLOCALISATION_MS },
    );
  }

  changerTexteCollage(valeur: string): void {
    this.texteCollage.set(valeur);
  }

  extraireDuTexteCollage(): void {
    const resultat = extraireCoordonneesTexte(this.texteCollage());
    if (resultat.trouve) {
      this.definirPosition({ latitude: resultat.latitude, longitude: resultat.longitude });
      this.erreurCollage.set(null);
      this.texteCollage.set('');
    } else if (resultat.lienCourt) {
      this.erreurCollage.set(
        'Les liens courts (goo.gl) ne peuvent pas être résolus ici : ouvrez-le dans un navigateur ' +
          'et collez le lien complet, ou saisissez directement les coordonnées (ex. 5.359951, -4.008256).',
      );
    } else {
      this.erreurCollage.set(
        'Format non reconnu. Collez un lien Google Maps ou des coordonnées (ex. 5.359951, -4.008256).',
      );
    }
  }

  effacer(): void {
    this.brouillon.set(null);
    this.avertissementPrecision.set(null);
    this.erreurGeolocalisation.set(null);
    this.erreurCollage.set(null);
    if (this.marqueur) {
      this.marqueur.remove();
      this.marqueur = null;
    }
  }

  confirmerEnregistrement(): void {
    this.enregistrer.emit(this.brouillon());
  }

  private definirPosition(position: CoordonneesGps, recentrer = true): void {
    this.brouillon.set(position);
    this.erreurCollage.set(null);
    this.poserMarqueur(position);
    if (recentrer && this.carte) {
      this.carte.panTo([position.latitude, position.longitude]);
    }
  }

  private poserMarqueur(position: CoordonneesGps): void {
    if (!this.carte) {
      return;
    }
    const latLng: L.LatLngTuple = [position.latitude, position.longitude];
    if (this.marqueur) {
      this.marqueur.setLatLng(latLng);
      return;
    }
    this.marqueur = L.marker(latLng, { draggable: true }).addTo(this.carte);
    this.marqueur.on('dragend', () => {
      const p = this.marqueur!.getLatLng();
      this.definirPosition({ latitude: p.lat, longitude: p.lng }, false);
    });
  }
}

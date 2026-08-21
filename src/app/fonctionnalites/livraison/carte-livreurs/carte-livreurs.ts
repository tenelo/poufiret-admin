import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { forkJoin, interval } from 'rxjs';
import * as L from 'leaflet';

import { BureauLivraisonService } from '../bureau/bureau-livraison.service';
import { extraireMessageErreurLivraison } from '../extraire-message-erreur-livraison';
import { CourseLivraison, StatutCourse } from '../modeles/course-livraison.model';
import { LivreurBureau } from '../modeles/livreur-bureau.model';
import { contenuPopupLivreur, contenuPopupPointCourse, iconeLivreur, iconePointCourse } from './marqueurs-carte';

const INTERVALLE_POLLING_MS = 8000;

// Centre par défaut si aucun livreur n'est encore positionné : région des
// Savanes (Côte d'Ivoire), faute de coordonnées de ville renvoyées par le backend.
const CENTRE_PAR_DEFAUT: L.LatLngTuple = [9.458, -5.6297];
const ZOOM_PAR_DEFAUT = 9;

// Statuts de course "en cours" pour lesquels on affiche les points A/B —
// on n'encombre pas la carte des courses déjà terminées/annulées.
const STATUTS_COURSE_ACTIFS: StatutCourse[] = ['assignee', 'acceptee', 'vers_a', 'colis_pris', 'vers_b'];

interface FondCarte {
  id: string;
  libelle: string;
  url: string;
  attribution: string;
}

const ATTRIBUTION_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Fonds gratuits, sans clé API. Standard en premier : c'est le défaut.
const FONDS_CARTE: FondCarte[] = [
  {
    id: 'standard',
    libelle: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: ATTRIBUTION_OSM,
  },
  {
    id: 'satellite',
    libelle: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
];

/**
 * Carte temps réel (polling ~8s) des livreurs de la ville du bureau, avec les
 * points A/B des courses actives. Module livraison isolé — pas de dépendance
 * aux services admin Poufiret. Pas de tracé d'itinéraire (chantier séparé).
 */
@Component({
  selector: 'app-carte-livreurs',
  imports: [DatePipe],
  templateUrl: './carte-livreurs.html',
  styleUrl: './carte-livreurs.scss',
})
export class CarteLivreurs implements AfterViewInit, OnDestroy {
  private readonly service = inject(BureauLivraisonService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly conteneurCarte = viewChild.required<ElementRef<HTMLDivElement>>('conteneurCarte');

  private carte: L.Map | null = null;
  private coucheTuiles: L.TileLayer | null = null;
  private readonly marqueursLivreurs = new Map<string, L.Marker>();
  private readonly marqueursCourses = new Map<string, L.Marker>();
  private timerErreurEphemere: ReturnType<typeof setTimeout> | undefined;

  readonly fondsCarte = FONDS_CARTE;
  readonly fondActuelId = signal(FONDS_CARTE[0].id);

  readonly chargementInitial = signal(true);
  readonly messageErreurEphemere = signal<string | null>(null);
  readonly enPause = signal(false);
  readonly derniereMiseAJour = signal<Date | null>(null);
  readonly livreursSansPosition = signal<LivreurBureau[]>([]);
  readonly aucunMarqueur = signal(false);

  ngAfterViewInit(): void {
    this.carte = L.map(this.conteneurCarte().nativeElement, { zoomControl: true }).setView(
      CENTRE_PAR_DEFAUT,
      ZOOM_PAR_DEFAUT,
    );
    this.appliquerFond(this.fondActuelId());

    this.rafraichir(true);

    interval(INTERVALLE_POLLING_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.enPause()) {
          this.rafraichir(false);
        }
      });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerErreurEphemere);
    this.carte?.remove();
    this.carte = null;
  }

  rafraichir(premierChargement: boolean): void {
    forkJoin({
      livreurs: this.service.listerLivreurs(),
      courses: this.service.listerCourses(),
    }).subscribe({
      next: ({ livreurs, courses }) => {
        this.chargementInitial.set(false);
        this.livreursSansPosition.set(livreurs.filter((l) => l.latitude === null || l.longitude === null));
        this.mettreAJourMarqueursLivreurs(livreurs);
        this.mettreAJourMarqueursCourses(courses);
        this.derniereMiseAJour.set(new Date());
        this.aucunMarqueur.set(this.marqueursLivreurs.size === 0 && this.marqueursCourses.size === 0);
        if (premierChargement) {
          this.recentrer();
        }
      },
      error: (erreur: unknown) => {
        this.chargementInitial.set(false);
        this.afficherErreurEphemere(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  basculerPause(): void {
    this.enPause.update((v) => !v);
  }

  /**
   * Change le fond de carte : retire uniquement la couche de tuiles et pose la
   * nouvelle, sans toucher aux marqueurs, au polling ni à la vue (centre/zoom)
   * courante.
   */
  changerFond(id: string): void {
    this.appliquerFond(id);
  }

  private appliquerFond(id: string): void {
    if (!this.carte) {
      return;
    }
    const fond = this.fondsCarte.find((f) => f.id === id) ?? this.fondsCarte[0];
    this.coucheTuiles?.remove();
    this.coucheTuiles = L.tileLayer(fond.url, { attribution: fond.attribution, maxZoom: 19 });
    this.coucheTuiles.addTo(this.carte);
    this.fondActuelId.set(fond.id);
  }

  recentrer(): void {
    const tousLesMarqueurs = [...this.marqueursLivreurs.values(), ...this.marqueursCourses.values()];
    if (!this.carte || tousLesMarqueurs.length === 0) {
      return;
    }
    const groupe = L.featureGroup(tousLesMarqueurs);
    this.carte.fitBounds(groupe.getBounds().pad(0.2), { maxZoom: 15 });
  }

  private mettreAJourMarqueursLivreurs(livreurs: LivreurBureau[]): void {
    if (!this.carte) {
      return;
    }
    const idsVus = new Set<string>();

    for (const livreur of livreurs) {
      if (livreur.latitude === null || livreur.longitude === null) {
        continue;
      }
      idsVus.add(livreur.id);
      const position: L.LatLngTuple = [livreur.latitude, livreur.longitude];
      const existant = this.marqueursLivreurs.get(livreur.id);
      if (existant) {
        existant.setLatLng(position);
        existant.setIcon(iconeLivreur(livreur.statut));
        existant.setPopupContent(contenuPopupLivreur(livreur));
      } else {
        const marqueur = L.marker(position, { icon: iconeLivreur(livreur.statut) }).bindPopup(
          contenuPopupLivreur(livreur),
        );
        marqueur.addTo(this.carte);
        this.marqueursLivreurs.set(livreur.id, marqueur);
      }
    }

    for (const [id, marqueur] of this.marqueursLivreurs) {
      if (!idsVus.has(id)) {
        marqueur.remove();
        this.marqueursLivreurs.delete(id);
      }
    }
  }

  private mettreAJourMarqueursCourses(courses: CourseLivraison[]): void {
    if (!this.carte) {
      return;
    }
    const clesVues = new Set<string>();
    const coursesActives = courses.filter((c) => STATUTS_COURSE_ACTIFS.includes(c.statut));

    for (const course of coursesActives) {
      this.poserOuMettreAJourPointCourse(course, 'A', clesVues);
      this.poserOuMettreAJourPointCourse(course, 'B', clesVues);
    }

    for (const [cle, marqueur] of this.marqueursCourses) {
      if (!clesVues.has(cle)) {
        marqueur.remove();
        this.marqueursCourses.delete(cle);
      }
    }
  }

  private poserOuMettreAJourPointCourse(course: CourseLivraison, lettre: 'A' | 'B', clesVues: Set<string>): void {
    const point = lettre === 'A' ? course.point_a : course.point_b;
    if (!point.gps || !this.carte) {
      return;
    }
    const cle = `${course.id}-${lettre}`;
    clesVues.add(cle);
    const position: L.LatLngTuple = [point.gps.latitude, point.gps.longitude];
    const existant = this.marqueursCourses.get(cle);
    if (existant) {
      existant.setLatLng(position);
      existant.setPopupContent(contenuPopupPointCourse(course, lettre));
    } else {
      const marqueur = L.marker(position, { icon: iconePointCourse(lettre) }).bindPopup(
        contenuPopupPointCourse(course, lettre),
      );
      marqueur.addTo(this.carte);
      this.marqueursCourses.set(cle, marqueur);
    }
  }

  private afficherErreurEphemere(message: string): void {
    this.messageErreurEphemere.set(message);
    clearTimeout(this.timerErreurEphemere);
    this.timerErreurEphemere = setTimeout(() => this.messageErreurEphemere.set(null), 4000);
  }
}

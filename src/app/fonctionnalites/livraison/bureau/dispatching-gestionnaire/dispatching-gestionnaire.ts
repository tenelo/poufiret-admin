import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { BureauLivraisonService } from '../bureau-livraison.service';
import { DialogAssignation } from '../dialog-assignation/dialog-assignation';
import { DialogCreationCourse } from '../dialog-creation-course/dialog-creation-course';
import { extraireMessageErreurLivraison } from '../../extraire-message-erreur-livraison';
import { formaterDateRelativeLivraison, formaterFcfa, telHref } from '../../formatage-livraison';
import {
  CourseLivraison,
  LIBELLES_STATUT_COURSE,
  OPTIONS_STATUT_COURSE,
  RequeteCreerCourse,
  StatutCourse,
  classeChipStatutCourse,
  estCourseAAssigner,
  estCourseAssignable,
} from '../../modeles/course-livraison.model';
import { LivreurBureau, OPTIONS_STATUT_LIVREUR, StatutLivreur, iconeVehicule } from '../../modeles/livreur-bureau.model';

const INTERVALLE_RAFRAICHISSEMENT_MS = 30000;

/**
 * Poste de dispatching du bureau (gestionnaire) : courses et livreurs de la
 * ville côte à côte, assignation manuelle, création de course. Module
 * livraison isolé — aucune dépendance à un service admin Poufiret.
 */
@Component({
  selector: 'app-dispatching-gestionnaire',
  imports: [DialogAssignation, DialogCreationCourse],
  templateUrl: './dispatching-gestionnaire.html',
  styleUrl: './dispatching-gestionnaire.scss',
})
export class DispatchingGestionnaire implements OnInit {
  private readonly service = inject(BureauLivraisonService);
  private readonly destroyRef = inject(DestroyRef);

  readonly optionsStatutCourse = OPTIONS_STATUT_COURSE;
  readonly optionsStatutLivreur = OPTIONS_STATUT_LIVREUR;
  readonly libellesStatutCourse = LIBELLES_STATUT_COURSE;
  readonly classeChipStatutCourse = classeChipStatutCourse;
  readonly estCourseAAssigner = estCourseAAssigner;
  readonly estCourseAssignable = estCourseAssignable;
  readonly iconeVehicule = iconeVehicule;
  readonly formaterDateRelativeLivraison = formaterDateRelativeLivraison;
  readonly formaterFcfa = formaterFcfa;
  readonly telHref = telHref;

  readonly messageSucces = signal<string | null>(null);

  // ---- Courses (filtre serveur) ----
  readonly filtreStatutCourse = signal<StatutCourse | ''>('');
  readonly coursesChargement = signal(true);
  readonly coursesErreur = signal<string | null>(null);
  readonly courses = signal<CourseLivraison[]>([]);

  // ---- Livreurs (roster complet, filtre affiché côté client) ----
  readonly filtreStatutLivreur = signal<StatutLivreur | ''>('');
  readonly livreursChargement = signal(true);
  readonly livreursErreur = signal<string | null>(null);
  readonly livreurs = signal<LivreurBureau[]>([]);

  readonly livreursAffiches = computed(() => {
    const filtre = this.filtreStatutLivreur();
    const liste = filtre ? this.livreurs().filter((l) => l.statut === filtre) : this.livreurs();
    return [...liste].sort((a, b) => {
      if (a.statut === b.statut) return a.nom.localeCompare(b.nom);
      return a.statut === 'en_ligne' ? -1 : 1;
    });
  });

  // ---- Dialog d'assignation ----
  readonly courseAAssigner = signal<CourseLivraison | null>(null);
  readonly assignationEnCours = signal(false);
  readonly erreurAssignation = signal<string | null>(null);

  // ---- Dialog de création ----
  readonly dialogCreationOuvert = signal(false);
  readonly creationEnCours = signal(false);
  readonly erreurCreation = signal<string | null>(null);

  ngOnInit(): void {
    this.chargerCourses();
    this.chargerLivreurs();

    interval(INTERVALLE_RAFRAICHISSEMENT_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chargerCourses(true);
        this.chargerLivreurs(true);
      });
  }

  rafraichirTout(): void {
    this.chargerCourses(false);
    this.chargerLivreurs(false);
  }

  chargerCourses(silencieux = false): void {
    if (!silencieux) {
      this.coursesChargement.set(true);
      this.coursesErreur.set(null);
    }
    this.service.listerCourses(this.filtreStatutCourse()).subscribe({
      next: (courses) => {
        this.coursesChargement.set(false);
        this.courses.set(courses);
      },
      error: (erreur: unknown) => {
        this.coursesChargement.set(false);
        if (!silencieux) {
          this.coursesErreur.set(extraireMessageErreurLivraison(erreur));
        }
      },
    });
  }

  chargerLivreurs(silencieux = false): void {
    if (!silencieux) {
      this.livreursChargement.set(true);
      this.livreursErreur.set(null);
    }
    // Roster complet (pas de statut) : le filtre statut est appliqué côté client
    // (livreursAffiches), pour rester synchronisé avec le dialog d'assignation.
    this.service.listerLivreurs().subscribe({
      next: (livreurs) => {
        this.livreursChargement.set(false);
        this.livreurs.set(livreurs);
      },
      error: (erreur: unknown) => {
        this.livreursChargement.set(false);
        if (!silencieux) {
          this.livreursErreur.set(extraireMessageErreurLivraison(erreur));
        }
      },
    });
  }

  changerFiltreStatutCourse(valeur: string): void {
    this.filtreStatutCourse.set(valeur as StatutCourse | '');
    this.chargerCourses(false);
  }

  changerFiltreStatutLivreur(valeur: string): void {
    this.filtreStatutLivreur.set(valeur as StatutLivreur | '');
  }

  // ---- Assignation ----

  ouvrirAssignation(course: CourseLivraison): void {
    this.erreurAssignation.set(null);
    this.courseAAssigner.set(course);
  }

  fermerAssignation(): void {
    this.courseAAssigner.set(null);
  }

  assigner(livreurId: string): void {
    const course = this.courseAAssigner();
    if (!course || this.assignationEnCours()) {
      return;
    }
    this.assignationEnCours.set(true);
    this.erreurAssignation.set(null);

    this.service.assignerLivreur(course.id, livreurId).subscribe({
      next: (courseMaj) => {
        this.assignationEnCours.set(false);
        this.courseAAssigner.set(null);
        this.messageSucces.set(`Livreur assigné à la course ${courseMaj.numero}.`);
        this.courses.update((liste) => liste.map((c) => (c.id === courseMaj.id ? courseMaj : c)));
      },
      error: (erreur: unknown) => {
        this.assignationEnCours.set(false);
        this.erreurAssignation.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }

  // ---- Création ----

  ouvrirCreation(): void {
    this.erreurCreation.set(null);
    this.dialogCreationOuvert.set(true);
  }

  fermerCreation(): void {
    this.dialogCreationOuvert.set(false);
  }

  soumettreCreation(payload: RequeteCreerCourse): void {
    this.creationEnCours.set(true);
    this.erreurCreation.set(null);

    this.service.creerCourse(payload).subscribe({
      next: (reponse) => {
        this.creationEnCours.set(false);
        this.dialogCreationOuvert.set(false);
        this.messageSucces.set(
          reponse.assigne
            ? `Course ${reponse.course.numero} créée et assignée à un livreur.`
            : `Course ${reponse.course.numero} créée, en attente d'assignation.`,
        );
        this.chargerCourses(false);
      },
      error: (erreur: unknown) => {
        this.creationEnCours.set(false);
        this.erreurCreation.set(extraireMessageErreurLivraison(erreur));
      },
    });
  }
}

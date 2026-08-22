import { Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { AuthService } from '../../../noyau/auth/auth.service';
import { MesCommandesService } from '../../../fonctionnalites/partenaire/mes-commandes/mes-commandes.service';
import { ResumeCommandes } from '../../../modeles/commande.model';

const INTERVALLE_POLLING_MS = 10000;
const DUREE_ANIMATION_MS = 1200;
const CHEMIN_SON_NOTIFICATION = 'sons/notification.wav';

/**
 * Cloche de notification (nouvelles commandes) de l'en-tête partenaire.
 * S'appuie sur DetecteurCompteur (noyau/notifications, générique) configuré
 * ici pour /orders/commandes/partenaire/resume/ + le champ `nouvelles` — le
 * futur usage "courses entrantes" de l'espace livraison réutilisera le même
 * DetecteurCompteur avec sa propre source, dans son propre composant cloche.
 */
@Component({
  selector: 'app-cloche-notifications',
  imports: [],
  providers: [DetecteurCompteur],
  templateUrl: './cloche-notifications.html',
  styleUrl: './cloche-notifications.scss',
})
export class ClocheNotifications implements OnInit {
  private readonly detecteur = inject(DetecteurCompteur<ResumeCommandes>);
  private readonly mesCommandesService = inject(MesCommandesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly lecteurAudio = viewChild<ElementRef<HTMLAudioElement>>('lecteurAudio');

  readonly cheminSon = CHEMIN_SON_NOTIFICATION;

  readonly nbNouvelles = this.detecteur.compteur;
  readonly resumeActuel = this.detecteur.derniereReponse;

  readonly enAnimation = signal(false);
  readonly panneauOuvert = signal(false);
  readonly badgeVu = signal(false);

  readonly badgeVisible = computed(() => this.nbNouvelles() > 0 && !this.badgeVu());

  private interactionUtilisateurEffectuee = false;

  constructor() {
    // effect() doit être appelé dans un contexte d'injection (constructeur) :
    // pas dans ngOnInit, cf. le bug takeUntilDestroyed déjà rencontré sur cet écran.
    effect(() => {
      if (this.detecteur.aAugmente()) {
        this.declencherNotification();
      }
    });
  }

  ngOnInit(): void {
    // Autorise la lecture du son après une première interaction utilisateur
    // (restriction des navigateurs sur la lecture audio automatique).
    const marquerInteraction = () => {
      this.interactionUtilisateurEffectuee = true;
    };
    document.addEventListener('pointerdown', marquerInteraction, { once: true });
    document.addEventListener('keydown', marquerInteraction, { once: true });
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('pointerdown', marquerInteraction);
      document.removeEventListener('keydown', marquerInteraction);
    });

    this.detecteur.demarrer({
      charger: () => this.mesCommandesService.resume(),
      selectionnerCompteur: (resume) => resume.nouvelles,
      intervalleMs: INTERVALLE_POLLING_MS,
      actif: () => this.authService.role() === 'partenaire',
    });
  }

  basculerPanneau(): void {
    const ouverture = !this.panneauOuvert();
    this.panneauOuvert.set(ouverture);
    if (ouverture) {
      // "À zéro visuel" une fois consulté — n'altère pas le vrai compteur backend.
      this.badgeVu.set(true);
    }
  }

  fermerPanneau(): void {
    this.panneauOuvert.set(false);
  }

  voirCommandes(): void {
    this.fermerPanneau();
    this.router.navigate(['/mes-commandes'], { queryParams: { statut: 'nouvelle' } });
  }

  private declencherNotification(): void {
    this.enAnimation.set(true);
    setTimeout(() => this.enAnimation.set(false), DUREE_ANIMATION_MS);
    // Une nouvelle notification "dé-consulte" le badge, même si le panneau
    // avait déjà été ouvert avant cette hausse.
    this.badgeVu.set(false);
    this.jouerSon();
    this.detecteur.accuserAugmentation();
  }

  private jouerSon(): void {
    if (!this.interactionUtilisateurEffectuee) {
      return;
    }
    const audio = this.lecteurAudio()?.nativeElement;
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Lecture bloquée par le navigateur : pas grave, la cloche visuelle suffit.
    });
  }
}

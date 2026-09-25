import { Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { DetecteurCompteur } from '../../../noyau/notifications/detecteur-compteur';
import { CHEMIN_SON_NOTIFICATION, SonNotification } from '../../../noyau/notifications/son-notification';
import { AuthService } from '../../../noyau/auth/auth.service';
import { MesCommandesService } from '../../../fonctionnalites/partenaire/mes-commandes/mes-commandes.service';
import { ResumeCommandes } from '../../../modeles/commande.model';

const INTERVALLE_POLLING_MS = 10000;
const DUREE_ANIMATION_MS = 1200;

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

  private readonly son = new SonNotification(this.destroyRef, () => this.lecteurAudio()?.nativeElement);

  readonly cheminSon = CHEMIN_SON_NOTIFICATION;

  readonly nbNouvelles = this.detecteur.compteur;
  readonly resumeActuel = this.detecteur.derniereReponse;

  readonly enAnimation = signal(false);
  readonly panneauOuvert = signal(false);
  readonly badgeVu = signal(false);

  readonly badgeVisible = computed(() => this.nbNouvelles() > 0 && !this.badgeVu());

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
    this.son.jouer();
    this.detecteur.accuserAugmentation();
  }
}

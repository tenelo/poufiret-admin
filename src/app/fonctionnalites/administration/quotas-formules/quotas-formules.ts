import { Component, OnInit, inject, output, signal } from '@angular/core';

import { PublicitesAdminService } from '../publicites-admin/publicites-admin.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { QuotaFormule } from '../../../modeles/publicites-admin.model';

/**
 * Carte "Quotas des formules" (GET /publicites/admin/formules/) : pour chaque formule, campagnes
 * actives / quota, places restantes, campagnes en attente et barre de remplissage.
 * Réutilisée sur le tableau de bord admin et en tête de la gestion des pubs ; le parent peut
 * la rafraîchir via `charger()` (ex. après une activation, un rejet ou un arrêt).
 */
@Component({
  selector: 'app-quotas-formules',
  imports: [],
  templateUrl: './quotas-formules.html',
  styleUrl: './quotas-formules.scss',
})
export class QuotasFormules implements OnInit {
  private readonly service = inject(PublicitesAdminService);

  /** Émis après chaque chargement réussi (le parent peut s'en servir, ex. options de filtre). */
  readonly charge = output<QuotaFormule[]>();

  readonly formules = signal<QuotaFormule[]>([]);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    // Rafraîchissement discret : on garde les données affichées tant que la nouvelle réponse n'est pas là.
    this.chargementEnCours.set(this.formules().length === 0);
    this.erreur.set(null);

    this.service.chargerQuotasFormules().subscribe({
      next: (formules) => {
        this.chargementEnCours.set(false);
        this.formules.set(formules);
        this.charge.emit(formules);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  estComplete(formule: QuotaFormule): boolean {
    return formule.places_restantes <= 0;
  }

  pourcentageRemplissage(formule: QuotaFormule): number {
    if (formule.quota_partenaires <= 0) {
      return 100;
    }
    return Math.min(100, Math.round((formule.nb_actives / formule.quota_partenaires) * 100));
  }
}

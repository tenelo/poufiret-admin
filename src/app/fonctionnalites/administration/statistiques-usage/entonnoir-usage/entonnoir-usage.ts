import { Component, effect, inject, input, signal, untracked } from '@angular/core';

import { StatistiquesUsageService } from '../statistiques-usage.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { formaterMontant } from '../../commandes-admin/formater-commande';
import { formaterNombre, formaterTaux } from '../../tableau-de-bord-admin/palette-graphiques';
import { EntonnoirUsage, FiltresStatistiquesUsage } from '../../../../modeles/statistiques-usage.model';

/** Libellés des rôles d'acteur d'une annulation (voir HistoriqueCommande.acteur_role côté backend). */
const LIBELLES_ACTEUR: Record<string, string> = {
  client: 'Client',
  partenaire: 'Partenaire',
  admin: 'Admin',
  livreur: 'Livreur',
  systeme: 'Système',
};

/** Entonnoir panier → commande → livraison (GET entonnoir/), motifs et détail par catégorie. */
@Component({
  selector: 'app-entonnoir-usage',
  imports: [],
  templateUrl: './entonnoir-usage.html',
  styleUrl: './entonnoir-usage.scss',
})
export class EntonnoirUsageSection {
  private readonly service = inject(StatistiquesUsageService);

  readonly filtres = input.required<FiltresStatistiquesUsage>();

  readonly donnees = signal<EntonnoirUsage | null>(null);
  readonly chargementEnCours = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly formaterNombre = formaterNombre;
  readonly formaterTaux = formaterTaux;
  readonly formaterMontant = formaterMontant;

  constructor() {
    effect(() => {
      const filtres = this.filtres();
      untracked(() => this.charger(filtres));
    });
  }

  libelleActeur(role: string | null): string {
    return role ? (LIBELLES_ACTEUR[role] ?? role) : '(inconnu)';
  }

  private charger(filtres: FiltresStatistiquesUsage): void {
    this.chargementEnCours.set(true);
    this.erreur.set(null);

    this.service.entonnoir(filtres).subscribe({
      next: (donnees) => {
        this.chargementEnCours.set(false);
        this.donnees.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

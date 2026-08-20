import { Component, OnInit, inject, signal } from '@angular/core';

import { MesCommandesService } from './mes-commandes.service';
import { DetailCommande } from './detail-commande/detail-commande';
import { extraireMessageErreur } from '../mes-produits/extraire-message-erreur';
import {
  Commande,
  LIBELLES_MODE_LIVRAISON,
  LIBELLES_STATUT_COMMANDE,
  OPTIONS_FILTRE_STATUT,
  StatutCommande,
} from '../../../modeles/commande.model';

/**
 * Page "Mes commandes" de l'espace partenaire : liste des commandes reçues,
 * filtrables par statut, avec accès au détail et aux transitions de statut.
 */
@Component({
  selector: 'app-mes-commandes',
  imports: [DetailCommande],
  templateUrl: './mes-commandes.html',
  styleUrl: './mes-commandes.scss',
})
export class MesCommandes implements OnInit {
  private readonly mesCommandesService = inject(MesCommandesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly commandes = signal<Commande[]>([]);
  readonly filtreStatut = signal<StatutCommande | ''>('');

  readonly commandeSelectionnee = signal<Commande | null>(null);

  readonly optionsFiltre = OPTIONS_FILTRE_STATUT;
  readonly libellesStatut = LIBELLES_STATUT_COMMANDE;
  readonly libellesModeLivraison = LIBELLES_MODE_LIVRAISON;

  ngOnInit(): void {
    this.chargerCommandes();
  }

  chargerCommandes(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.mesCommandesService.listerCommandesPartenaire(this.filtreStatut()).subscribe({
      next: (commandes) => {
        this.chargementEnCours.set(false);
        this.commandes.set(
          [...commandes].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        );
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  changerFiltre(statut: StatutCommande | ''): void {
    if (statut === this.filtreStatut()) {
      return;
    }
    this.filtreStatut.set(statut);
    this.chargerCommandes();
  }

  ouvrirDetail(commande: Commande): void {
    this.commandeSelectionnee.set(commande);
  }

  fermerDetail(): void {
    this.commandeSelectionnee.set(null);
  }

  surCommandeMiseAJour(commandeMaj: Commande): void {
    this.commandes.update((liste) =>
      liste.map((c) => (c.id === commandeMaj.id ? commandeMaj : c)),
    );
    this.commandeSelectionnee.set(commandeMaj);
  }

  /** Date relative simple (à l'instant / il y a N min / il y a N h / il y a N j / date). */
  formaterDateRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { MesCategoriesService } from './mes-categories.service';
import { MaCategorie } from '../../../modeles/ma-categorie.model';

// Taille max acceptée côté client pour une image de couverture de catégorie.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

interface EtatCategorie {
  categorie: MaCategorie;
  apercu: string | null;
  enCours: boolean;
}

/**
 * Page "Mes catégories" de l'espace partenaire : liste des catégories du partenaire
 * et remplacement de l'image de couverture propre à chacune (PATCH /auth/mes-categories/<id>/).
 */
@Component({
  selector: 'app-mes-categories',
  imports: [],
  templateUrl: './mes-categories.html',
  styleUrl: './mes-categories.scss',
})
export class MesCategories implements OnInit, OnDestroy {
  private readonly mesCategoriesService = inject(MesCategoriesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);

  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  readonly categories = signal<EtatCategorie[]>([]);

  ngOnInit(): void {
    this.chargerCategories();
  }

  ngOnDestroy(): void {
    for (const etat of this.categories()) {
      if (etat.apercu) URL.revokeObjectURL(etat.apercu);
    }
  }

  chargerCategories(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.mesCategoriesService.listerMesCategories().subscribe({
      next: (categories) => {
        this.chargementEnCours.set(false);
        try {
          this.categories.set(
            categories.map((categorie) => ({ categorie, apercu: null, enCours: false })),
          );
        } catch {
          this.erreurChargement.set(
            "Réponse inattendue du serveur en chargeant les catégories. Contactez le support si le problème persiste.",
          );
        }
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  /** Appelé lors du choix d'un fichier pour la carte de la catégorie donnée. */
  selectionnerImage(evenement: Event, id: number): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0] ?? null;
    entree.value = ''; // permet de resélectionner le même fichier plus tard

    if (!fichier) {
      return;
    }

    this.messageErreur.set(null);
    this.messageSucces.set(null);

    if (!fichier.type.startsWith('image/')) {
      this.messageErreur.set('Le fichier sélectionné doit être une image.');
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE_OCTETS) {
      this.messageErreur.set("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const url = URL.createObjectURL(fichier);
    this.mettreAJourEtat(id, (etat) => {
      if (etat.apercu) URL.revokeObjectURL(etat.apercu);
      return { ...etat, apercu: url, enCours: true };
    });

    this.mesCategoriesService.changerImageCouverture(id, fichier).subscribe({
      next: (categorie) => {
        this.mettreAJourEtat(id, (etat) => {
          if (etat.apercu) URL.revokeObjectURL(etat.apercu);
          return { categorie, apercu: null, enCours: false };
        });
        this.messageSucces.set(`Image de "${categorie.categorie_nom}" mise à jour avec succès.`);
      },
      error: (erreur: unknown) => {
        this.mettreAJourEtat(id, (etat) => ({ ...etat, enCours: false }));
        this.messageErreur.set(this.extraireMessageErreur(erreur));
      },
    });
  }

  private mettreAJourEtat(id: number, transformer: (etat: EtatCategorie) => EtatCategorie): void {
    this.categories.update((liste) =>
      liste.map((etat) => (etat.categorie.id === id ? transformer(etat) : etat)),
    );
  }

  private extraireMessageErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      if (erreur.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez votre connexion ou la configuration CORS du backend.";
      }
      const corps = erreur.error;
      // Une page d'erreur HTML (ex. 500 Django hors mode debug) n'est pas un
      // message affichable : on retombe sur le message générique dans ce cas.
      if (typeof corps === 'string' && !/^\s*<(!doctype|html)/i.test(corps)) {
        return corps;
      }
      if (typeof corps?.message === 'string') {
        return corps.message;
      }
      if (typeof corps?.details?.detail === 'string') {
        return corps.details.detail;
      }
      if (typeof corps?.detail === 'string') {
        return corps.detail;
      }
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  }
}

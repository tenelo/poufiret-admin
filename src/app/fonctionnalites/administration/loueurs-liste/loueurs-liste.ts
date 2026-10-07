import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { LocationService } from '../../locations/location.service';
import { extraireMessageErreur } from '../tableau-de-bord-admin/extraire-message-erreur';
import { LoueurAdminListe } from '../../../modeles/logement.model';

/**
 * Liste admin des loueurs (capacité gerer_locations) : indicateurs logements disponibles / réservés
 * / loués et demandes en attente (alerte si > 0). Recherche entièrement côté client (GET
 * /locations/admin/ renvoie la liste complète). Clic sur un loueur : l'espace loueur en tant
 * qu'admin (préfixe admin/<id>), même pattern que RestaurantsListe.
 */
@Component({
  selector: 'app-loueurs-liste',
  imports: [],
  templateUrl: './loueurs-liste.html',
  styleUrl: './loueurs-liste.scss',
})
export class LoueursListe implements OnInit {
  private readonly service = inject(LocationService);
  private readonly router = inject(Router);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly loueurs = signal<LoueurAdminListe[]>([]);

  readonly recherche = signal('');

  readonly departements = computed(() =>
    [...new Set(this.loueurs().map((l) => l.departement_nom).filter((d): d is string => !!d))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  readonly departementFiltre = signal('');

  readonly loueursFiltres = computed(() => {
    const texte = this.recherche().trim().toLowerCase();
    const departement = this.departementFiltre();
    return this.loueurs().filter((l) => {
      if (departement && l.departement_nom !== departement) return false;
      if (!texte) return true;
      return l.nom.toLowerCase().includes(texte) || (l.departement_nom?.toLowerCase().includes(texte) ?? false);
    });
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service
      .listerLoueursAdmin()
      .pipe(finalize(() => this.chargementEnCours.set(false)))
      .subscribe({
        next: (loueurs) => this.loueurs.set(loueurs),
        error: (erreur: unknown) => this.erreurChargement.set(extraireMessageErreur(erreur)),
      });
  }

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  changerDepartement(valeur: string): void {
    this.departementFiltre.set(valeur);
  }

  ouvrir(loueur: LoueurAdminListe): void {
    this.router.navigate(['/administration/locations', loueur.id], {
      state: { nom: loueur.nom },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';

import { OngletGestionPublicitesService } from '../onglet-gestion-publicites/onglet-gestion-publicites.service';
import { AfficheFormules } from '../onglet-gestion-publicites/affiches-formules/affiches-formules';
import { extraireMessageErreur } from '../../mes-produits/extraire-message-erreur';
import { FormulePublicite } from '../../../../modeles/publicite.model';

/**
 * Onglet "Formules disponibles" : catalogue pédagogique des formules
 * publicitaires (prix, durée, emplacements dans l'app mobile), sans lien avec
 * les campagnes du partenaire — juste de la présentation, en lecture seule.
 */
@Component({
  selector: 'app-onglet-formules-disponibles',
  imports: [AfficheFormules],
  templateUrl: './onglet-formules-disponibles.html',
  styleUrl: './onglet-formules-disponibles.scss',
})
export class OngletFormulesDisponibles implements OnInit {
  private readonly service = inject(OngletGestionPublicitesService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly formules = signal<FormulePublicite[]>([]);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.listerFormules().subscribe({
      next: (formules) => {
        this.chargementEnCours.set(false);
        this.formules.set(formules);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';

import { LocationService } from '../../../locations/location.service';
import { erreurChamp, extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { ParametresVitrine } from '../../../../modeles/vitrine-etablissement.model';

/**
 * Onglet "Locations" de Paramètres (super-admin seulement, GET/PATCH P/admin/parametres/,
 * 403 sans super-admin) : nombre maximum d'images de la vitrine d'un hôtel/résidence.
 */
@Component({
  selector: 'app-onglet-locations-parametres',
  imports: [],
  templateUrl: './onglet-locations-parametres.html',
  styleUrl: './onglet-locations-parametres.scss',
})
export class OngletLocationsParametres implements OnInit {
  private readonly service = inject(LocationService);

  readonly chargementEnCours = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly parametres = signal<ParametresVitrine | null>(null);

  readonly nbMaxImages = signal('');
  readonly enregistrementEnCours = signal(false);
  readonly erreurNbMaxImages = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementEnCours.set(true);
    this.erreurChargement.set(null);

    this.service.obtenirParametresVitrine().subscribe({
      next: (parametres) => {
        this.chargementEnCours.set(false);
        this.appliquer(parametres);
      },
      error: (erreur: unknown) => {
        this.chargementEnCours.set(false);
        this.erreurChargement.set(extraireMessageErreur(erreur));
      },
    });
  }

  private appliquer(parametres: ParametresVitrine): void {
    this.parametres.set(parametres);
    this.nbMaxImages.set(String(parametres.nb_max_images_vitrine));
  }

  changerNbMaxImages(valeur: string): void {
    this.nbMaxImages.set(valeur);
  }

  soumettre(): void {
    const nombre = Number(this.nbMaxImages());
    if (!Number.isInteger(nombre) || nombre < 1 || this.enregistrementEnCours()) {
      return;
    }

    this.enregistrementEnCours.set(true);
    this.erreurNbMaxImages.set(null);
    this.messageSucces.set(null);

    this.service.modifierParametresVitrine(nombre).subscribe({
      next: (parametres) => {
        this.enregistrementEnCours.set(false);
        this.appliquer(parametres);
        this.messageSucces.set('Paramètre enregistré.');
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.erreurNbMaxImages.set(erreurChamp(erreur, 'nb_max_images_vitrine') ?? extraireMessageErreur(erreur));
      },
    });
  }
}

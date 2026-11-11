import { Component, computed, input, output } from '@angular/core';

import { PhotoDisponibleVitrine } from '../../../../modeles/vitrine-etablissement.model';

interface GroupePhotosChambre {
  cle: string;
  nom: string;
  photos: PhotoDisponibleVitrine[];
}

/**
 * Fenêtre « Choisir parmi mes photos » : photos déjà téléversées sur les hébergements (chambres),
 * groupées par chambre ; une photo déjà dans la vitrine est marquée et non sélectionnable. Ne fait
 * pas l'appel réseau : émet la photo choisie, le parent (OngletVitrine) gère l'ajout.
 */
@Component({
  selector: 'app-choisir-photo-vitrine',
  imports: [],
  templateUrl: './choisir-photo-vitrine.html',
  styleUrl: './choisir-photo-vitrine.scss',
})
export class ChoisirPhotoVitrine {
  readonly photos = input.required<PhotoDisponibleVitrine[]>();

  readonly choisie = output<PhotoDisponibleVitrine>();
  readonly annule = output<void>();

  readonly groupes = computed<GroupePhotosChambre[]>(() => {
    const parChambre = new Map<string, GroupePhotosChambre>();
    for (const photo of this.photos()) {
      const cle = photo.hebergement_id !== null ? String(photo.hebergement_id) : 'sans-chambre';
      if (!parChambre.has(cle)) {
        parChambre.set(cle, { cle, nom: photo.hebergement_nom ?? 'Autres photos', photos: [] });
      }
      parChambre.get(cle)!.photos.push(photo);
    }
    return [...parChambre.values()];
  });

  choisir(photo: PhotoDisponibleVitrine): void {
    if (photo.dans_vitrine) {
      return;
    }
    this.choisie.emit(photo);
  }
}

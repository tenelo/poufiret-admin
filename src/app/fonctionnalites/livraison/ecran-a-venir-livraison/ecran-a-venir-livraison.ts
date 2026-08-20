import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Placeholder générique pour les écrans TeneLivr pas encore construits (A1 :
 * coquille seulement, écrans métier à venir). Copie locale volontaire de
 * fonctionnalites/administration/ecran-a-venir — le module livraison ne doit
 * importer aucun composant du module administration (isolation).
 */
@Component({
  selector: 'app-ecran-a-venir-livraison',
  imports: [],
  templateUrl: './ecran-a-venir-livraison.html',
  styleUrl: './ecran-a-venir-livraison.scss',
})
export class EcranAVenirLivraison {
  private readonly route = inject(ActivatedRoute);

  readonly titre = (this.route.snapshot.data['titre'] as string) ?? 'Écran';
}

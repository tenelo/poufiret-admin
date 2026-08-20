import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Placeholder générique pour les écrans admin pas encore construits. Le titre
 * (et, optionnellement, le message) affichés viennent de `route.data` — une
 * même route.data.capacite continue de protéger l'accès via capaciteGuard.
 */
@Component({
  selector: 'app-ecran-a-venir',
  imports: [],
  templateUrl: './ecran-a-venir.html',
  styleUrl: './ecran-a-venir.scss',
})
export class EcranAVenir {
  private readonly route = inject(ActivatedRoute);

  readonly titre = (this.route.snapshot.data['titre'] as string) ?? 'Écran';
  readonly message =
    (this.route.snapshot.data['message'] as string) ?? 'Cet écran sera construit prochainement.';
}

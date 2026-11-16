import { Component, input, output } from '@angular/core';

import {
  ActionTransitionPubliciteAdmin,
  LIBELLES_STATUT_PUBLICITE_ADMIN,
  PubliciteAdmin,
  StatutPubliciteAdmin,
} from '../../../../modeles/publicites-admin.model';

/**
 * Vue « Tableau » de la liste des pubs (en alternative aux cartes, inchangées) : une ligne par
 * pub. Composant présentationnel : toute la logique (droits, actions possibles, formatage) reste
 * dans PublicitesAdmin et lui est passée en entrée, pour ne jamais la dupliquer.
 */
@Component({
  selector: 'app-tableau-publicites-admin',
  imports: [],
  templateUrl: './tableau-publicites-admin.html',
  styleUrl: './tableau-publicites-admin.scss',
})
export class TableauPublicitesAdmin {
  readonly publicites = input.required<PubliciteAdmin[]>();
  readonly pubMiseEnEvidence = input<string | null>(null);
  readonly peutGererPubsPartenaires = input(false);
  readonly peutModerer = input(false);
  readonly transitionEnCoursId = input<string | null>(null);

  readonly peutReconduire = input.required<(pub: PubliciteAdmin) => boolean>();
  readonly actionsDisponibles = input.required<(pub: PubliciteAdmin) => ActionTransitionPubliciteAdmin[]>();
  readonly formaterDate = input.required<(iso: string | null | undefined) => string>();
  readonly originalDisponible = input.required<(pub: PubliciteAdmin) => boolean>();
  readonly imageValide = input.required<(pub: PubliciteAdmin) => boolean>();
  readonly allerVersOriginal = input.required<(pub: PubliciteAdmin) => void>();

  readonly reconduire = output<PubliciteAdmin>();
  readonly demanderAction = output<{ publicite: PubliciteAdmin; action: ActionTransitionPubliciteAdmin }>();
  readonly ouvrirMedia = output<PubliciteAdmin>();
  readonly erreurImage = output<string>();

  readonly libellesStatut: Record<StatutPubliciteAdmin, string> = LIBELLES_STATUT_PUBLICITE_ADMIN;
}

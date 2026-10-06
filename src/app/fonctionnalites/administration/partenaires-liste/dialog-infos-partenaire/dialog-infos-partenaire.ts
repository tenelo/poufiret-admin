import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { CreationPartenaireService } from '../../creation-partenaire/creation-partenaire.service';
import { CreationPartenaire } from '../../creation-partenaire/creation-partenaire';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { classeChipStatutPartenaireListe, PartenaireListe } from '../../../../modeles/partenaire-liste.model';
import { ReponseEditionPartenaire } from '../../../../modeles/edition-partenaire-admin.model';

/**
 * Dialog "Voir les informations" d'un partenaire (fiche admin) : vue lecture complète
 * (GET /administration/partenaires/<id>/edition/, fusionnée avec les champs déjà connus
 * de la ligne) avec bascule vers l'édition dans le même dialog — réutilise
 * CreationPartenaire en mode édition, sans le dupliquer ni rouvrir un autre dialog.
 */
@Component({
  selector: 'app-dialog-infos-partenaire',
  imports: [CreationPartenaire, DatePipe],
  templateUrl: './dialog-infos-partenaire.html',
  styleUrl: './dialog-infos-partenaire.scss',
})
export class DialogInfosPartenaire implements OnInit {
  private readonly service = inject(CreationPartenaireService);

  readonly partenaire = input.required<PartenaireListe>();
  /** Affiche le bouton "Modifier" (droit creer_partenaire / super-admin). */
  readonly peutModifier = input(false);

  readonly ferme = output<void>();
  readonly enregistre = output<ReponseEditionPartenaire>();

  readonly classeChipStatut = classeChipStatutPartenaireListe;

  readonly mode = signal<'lecture' | 'edition'>('lecture');
  readonly chargementInfos = signal(true);
  readonly erreurInfos = signal<string | null>(null);
  readonly infos = signal<ReponseEditionPartenaire | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargementInfos.set(true);
    this.erreurInfos.set(null);

    this.service.chargerPourEdition(this.partenaire().id).subscribe({
      next: (donnees) => {
        this.chargementInfos.set(false);
        this.infos.set(donnees);
      },
      error: (erreur: unknown) => {
        this.chargementInfos.set(false);
        this.erreurInfos.set(extraireMessageErreur(erreur));
      },
    });
  }

  passerEnEdition(): void {
    this.mode.set('edition');
  }

  surEnregistrement(donnees: ReponseEditionPartenaire): void {
    this.infos.set(donnees);
    this.mode.set('lecture');
    this.enregistre.emit(donnees);
  }
}

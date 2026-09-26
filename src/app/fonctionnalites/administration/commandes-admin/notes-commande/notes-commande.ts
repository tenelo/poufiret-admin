import { Component, inject, input, output, signal } from '@angular/core';

import { CommandesAdminService } from '../commandes-admin.service';
import { extraireMessageErreur } from '../../tableau-de-bord-admin/extraire-message-erreur';
import { NoteAdmin } from '../../../../modeles/commande-admin.model';
import { formaterDateHeure } from '../formater-commande';

/** Notes internes d'une commande : liste + ajout (visibles uniquement par l'administration). */
@Component({
  selector: 'app-notes-commande',
  imports: [],
  templateUrl: './notes-commande.html',
  styleUrl: './notes-commande.scss',
})
export class NotesCommande {
  private readonly service = inject(CommandesAdminService);

  readonly commandeId = input.required<number>();
  readonly notes = input.required<NoteAdmin[]>();

  /** Émis avec la note créée, pour que le parent l'ajoute à son détail. */
  readonly noteAjoutee = output<NoteAdmin>();

  readonly formaterDateHeure = formaterDateHeure;

  readonly texte = signal('');
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  ajouter(): void {
    const texte = this.texte().trim();
    if (!texte || this.enCours()) {
      return;
    }
    this.enCours.set(true);
    this.erreur.set(null);

    this.service.ajouterNote(this.commandeId(), texte).subscribe({
      next: (note) => {
        this.enCours.set(false);
        this.texte.set('');
        this.noteAjoutee.emit(note);
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        this.erreur.set(extraireMessageErreur(erreur));
      },
    });
  }
}

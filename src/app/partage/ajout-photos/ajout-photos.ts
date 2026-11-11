import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { Observable, concatMap, from, tap, toArray } from 'rxjs';

import { extraireMessageErreur } from '../../fonctionnalites/partenaire/mes-produits/extraire-message-erreur';
import { extraireErreursFormulaire } from '../../fonctionnalites/administration/publicites-admin/formules-parametres-pub/extraire-erreurs-champs';

/** Taille max acceptée côté client pour une photo d'article (inchangée). */
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

/** Envoi d'une photo : fourni par l'écran parent (catalogue partenaire ou carte d'établissement). */
export type TeleverserPhoto = (fichier: File, estPrincipale: boolean) => Observable<unknown>;

/**
 * Ajout de photos d'un article, partagé par « Mes produits » (GestionImages) et la carte de
 * l'espace établissement, côté partenaire comme côté admin (CarteImages) :
 * - compteur « n / max » (max = plafond effectif renvoyé par le serveur ; sans plafond connu,
 *   simple nombre de photos) ;
 * - sélection de plusieurs photos à la fois, limitée aux places restantes ;
 * - envoi une par une, dans l'ordre choisi ; « principale » ne vaut que pour la première ;
 * - bouton d'ajout désactivé au plafond ;
 * - erreur du serveur affichée telle quelle (les photos déjà envoyées restent ajoutées).
 */
@Component({
  selector: 'app-ajout-photos',
  imports: [],
  templateUrl: './ajout-photos.html',
  styleUrl: './ajout-photos.scss',
})
export class AjoutPhotos implements OnDestroy {
  /** Nombre de photos déjà enregistrées. */
  readonly nbPhotos = input.required<number>();
  /** Plafond effectif (null = inconnu : aucun plafond appliqué côté écran). */
  readonly plafond = input<number | null>(null);
  readonly televerser = input.required<TeleverserPhoto>();
  /** Coche « principale » proposée par défaut (ex. première photo d'un plat). */
  readonly principaleParDefaut = input(false);
  readonly messagePlafond = input('Nombre maximum de photos atteint pour cet article.');

  /** Émis pour chaque photo enregistrée (réponse du serveur). */
  readonly ajoutee = output<unknown>();
  /** Émis à la fin d'un envoi réussi, avec le nombre de photos ajoutées. */
  readonly termine = output<number>();

  readonly selection = signal<{ fichier: File; apercu: string }[]>([]);
  readonly premierePrincipale = signal(false);
  readonly envoiEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);

  readonly placesRestantes = computed(() => {
    const plafond = this.plafond();
    return plafond === null ? Infinity : Math.max(0, plafond - this.nbPhotos());
  });
  readonly plafondAtteint = computed(() => this.placesRestantes() <= 0);

  ngOnDestroy(): void {
    this.viderSelection();
  }

  selectionner(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    const fichiers = Array.from(entree.files ?? []);
    entree.value = '';
    if (fichiers.length === 0) return;

    this.messageErreur.set(null);
    const erreurs: string[] = [];
    const valides = fichiers.filter((f) => {
      if (!f.type.startsWith('image/')) {
        erreurs.push(`« ${f.name} » n'est pas une image.`);
        return false;
      }
      if (f.size > TAILLE_MAX_IMAGE_OCTETS) {
        erreurs.push(`« ${f.name} » dépasse 5 Mo.`);
        return false;
      }
      return true;
    });

    const places = this.placesRestantes();
    const retenues = valides.slice(0, places);
    if (valides.length > retenues.length) {
      erreurs.push(
        `Plafond de ${this.plafond()} photos : ${retenues.length} photo(s) retenue(s), les autres n'ont pas été ajoutées.`,
      );
    }
    if (erreurs.length > 0) this.messageErreur.set(erreurs.join(' '));
    if (retenues.length === 0) return;

    this.viderSelection();
    this.selection.set(retenues.map((fichier) => ({ fichier, apercu: URL.createObjectURL(fichier) })));
    this.premierePrincipale.set(this.principaleParDefaut());
  }

  annuler(): void {
    this.viderSelection();
  }

  envoyer(): void {
    const aEnvoyer = this.selection();
    if (aEnvoyer.length === 0 || this.envoiEnCours() || this.plafondAtteint()) return;

    this.envoiEnCours.set(true);
    this.messageErreur.set(null);
    const televerser = this.televerser();
    const premierePrincipale = this.premierePrincipale();

    from(aEnvoyer.map((element, index) => ({ element, index })))
      .pipe(
        concatMap(({ element, index }) =>
          televerser(element.fichier, index === 0 && premierePrincipale).pipe(
            tap((reponse) => {
              this.ajoutee.emit(reponse);
              this.retirerDeLaSelection(element.fichier);
            }),
          ),
        ),
        toArray(),
      )
      .subscribe({
        next: (reponses) => {
          this.envoiEnCours.set(false);
          this.termine.emit(reponses.length);
        },
        // Message du serveur tel quel ; les photos non envoyées restent sélectionnées.
        error: (erreur: unknown) => {
          this.envoiEnCours.set(false);
          this.messageErreur.set(messageServeur(erreur));
        },
      });
  }

  private retirerDeLaSelection(fichier: File): void {
    this.selection.update((liste) => {
      const element = liste.find((e) => e.fichier === fichier);
      if (element) URL.revokeObjectURL(element.apercu);
      return liste.filter((e) => e.fichier !== fichier);
    });
  }

  private viderSelection(): void {
    for (const element of this.selection()) URL.revokeObjectURL(element.apercu);
    this.selection.set([]);
  }
}

/** Message global du serveur ; pour un 400 de champ ({image: ["…"]}), son premier message. */
function messageServeur(erreur: unknown): string {
  const formulaire = extraireErreursFormulaire(erreur);
  if (formulaire) {
    return formulaire.general ?? Object.values(formulaire.champs)[0] ?? extraireMessageErreur(erreur);
  }
  return extraireMessageErreur(erreur);
}

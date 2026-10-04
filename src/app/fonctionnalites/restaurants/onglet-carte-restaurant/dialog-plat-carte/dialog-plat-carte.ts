import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';

import { RestaurantService, PrefixeRestaurant } from '../../restaurant.service';
import { CarteImages } from '../carte-images/carte-images';
import { extraireMessageErreur } from '../../extraire-message-erreur';
import {
  GroupeOptionCarte,
  OptionCarte,
  PlatCarte,
  RequetePlatCarte,
  RequeteVarianteCarte,
  SectionCarte,
  VarianteCarte,
} from '../../../../modeles/carte-restaurant.model';

type OngletDialogPlat = 'infos' | 'images' | 'variantes' | 'options';

/** Contexte d'un changement de prix en attente de confirmation (voir confirmerPrix()). */
interface ContextePrix {
  origine: 'plat' | 'variante';
  nouveauPrix: number;
  // Seulement pour origine 'variante' : la variante qui devient la nouvelle variante par défaut.
  varianteId?: number;
  varianteNom?: string;
  // Seulement pour origine 'plat' : les autres champs du formulaire Infos, à envoyer avec le
  // nouveau prix une fois la confirmation obtenue.
  donneesPlatEnAttente?: RequetePlatCarte;
  // Prix finaux de chaque variante AVANT ce changement (pour le recalcul des suppléments).
  finauxAvant: Map<number, number>;
}

/**
 * Dialog de création/édition d'un plat de carte : infos, photos, variantes et groupes d'options.
 * Les sous-ressources (images, variantes, options) ne sont gérables qu'une fois le plat créé — en
 * création, le dialog bascule automatiquement en mode édition dès l'enregistrement réussi, sans se
 * refermer. Images, variantes et groupes d'options (avec leurs options) sont imbriqués en lecture
 * dans la réponse du plat : après chaque mutation, on relit le plat (RestaurantService.obtenirPlat)
 * plutôt que de rappeler des listes séparées.
 *
 * Règle de prix des variantes (voir carte-restaurant.model.ts) : le restaurateur saisit toujours
 * le PRIX FINAL d'une variante ; le supplément envoyé au backend est calculé ici
 * (prix final − prix du plat). Changer le prix de base du plat, ou désigner une nouvelle variante
 * par défaut (qui doit avoir un supplément nul), proposent de conserver les prix finaux actuels des
 * autres variantes en recalculant leurs suppléments.
 */
@Component({
  selector: 'app-dialog-plat-carte',
  imports: [CarteImages],
  templateUrl: './dialog-plat-carte.html',
  styleUrl: './dialog-plat-carte.scss',
})
export class DialogPlatCarte implements OnInit {
  private readonly service = inject(RestaurantService);

  readonly prefixe = input.required<PrefixeRestaurant>();
  readonly plat = input<PlatCarte | null>(null);
  readonly sections = input.required<SectionCarte[]>();
  readonly sectionParDefaut = input<number | null>(null);
  /** Ordre proposé à la création (ex. nombre de plats déjà présents dans la section ciblée). */
  readonly ordreParDefaut = input(0);

  readonly ferme = output<void>();
  /** Émis après chaque création/modification réussie, pour que le parent rafraîchisse sa liste. */
  readonly enregistre = output<void>();

  readonly ongletActif = signal<OngletDialogPlat>('infos');

  // Plat courant affiché par le dialog : celui en entrée, ou celui tout juste créé (voir commentaire plus haut).
  readonly platCourant = signal<PlatCarte | null>(null);

  readonly nom = signal('');
  readonly description = signal('');
  readonly prix = signal('');
  readonly section = signal<number | ''>('');
  readonly estActif = signal(true);
  readonly estDisponible = signal(true);
  readonly estReserveAuxMenus = signal(false);

  readonly enregistrementEnCours = signal(false);
  readonly messageErreur = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  /** Prix de base actuel du plat, tel que saisi dans le formulaire (même non encore enregistré). */
  readonly prixPlatActuel = () => Number(this.prix()) || 0;

  // ---- Variantes ----
  readonly nouvelleVarianteNom = signal('');
  readonly nouvelleVariantePrixFinal = signal('');
  readonly erreurVariantes = signal<string | null>(null);
  // Saisie en cours du prix final d'une variante existante (clé = id de la variante).
  readonly prixFinalSaisi = signal<Record<number, string>>({});

  // ---- Groupes d'options ----
  readonly nouveauGroupeLibelle = signal('');
  readonly nouveauGroupeMin = signal('1');
  readonly nouveauGroupeMax = signal('1');
  readonly erreurGroupes = signal<string | null>(null);
  readonly nouvelleOptionNom = signal<Record<number, string>>({});
  readonly nouvelleOptionPrix = signal<Record<number, string>>({});

  // ---- Confirmation d'un changement de prix affectant les variantes ----
  readonly confirmationPrixOuverte = signal(false);
  private confirmationPrixContexte: ContextePrix | null = null;
  readonly confirmationPrixTitre = signal('');
  readonly conserverPrixFinaux = signal(true);
  readonly confirmationPrixEnCours = signal(false);
  readonly erreurConfirmationPrix = signal<string | null>(null);

  ngOnInit(): void {
    const plat = this.plat();
    this.platCourant.set(plat);
    if (plat) {
      this.appliquerPlat(plat);
    } else {
      this.section.set(this.sectionParDefaut() ?? '');
    }
  }

  private appliquerPlat(plat: PlatCarte): void {
    this.nom.set(plat.nom);
    this.description.set(plat.description ?? '');
    this.prix.set(String(plat.prix));
    this.section.set(plat.section_menu ?? '');
    this.estActif.set(plat.est_actif);
    this.estDisponible.set(plat.est_disponible);
    this.estReserveAuxMenus.set(plat.est_reserve_aux_menus);
  }

  changerOnglet(onglet: OngletDialogPlat): void {
    if (onglet !== 'infos' && !this.platCourant()) return;
    this.ongletActif.set(onglet);
  }

  // ---- Infos ----

  soumettre(): void {
    const prix = Number(this.prix());
    const erreurs: Record<string, string> = {};
    if (!this.nom().trim()) erreurs['nom'] = 'Le nom est requis.';
    if (this.prix().trim() === '' || Number.isNaN(prix) || prix < 0) {
      erreurs['prix'] = 'Le prix doit être un nombre positif ou nul.';
    }
    this.erreursChamps.set(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    const donnees: RequetePlatCarte = {
      nom: this.nom().trim(),
      description: this.description().trim(),
      section_menu: this.section() === '' ? null : Number(this.section()),
      prix,
      est_actif: this.estActif(),
      est_disponible: this.estDisponible(),
      est_reserve_aux_menus: this.estReserveAuxMenus(),
      ordre: this.platCourant()?.ordre ?? this.ordreParDefaut(),
    };

    const courant = this.platCourant();
    if (courant && courant.variantes.length > 0 && prix !== courant.prix) {
      // Le prix de base change alors que des variantes existent : demande d'abord comment traiter
      // leurs suppléments, avant d'envoyer quoi que ce soit.
      this.ouvrirConfirmationPrix({
        origine: 'plat',
        nouveauPrix: prix,
        donneesPlatEnAttente: donnees,
        finauxAvant: new Map(courant.variantes.map((v) => [v.id, courant.prix + v.prix_supplement])),
      });
      this.confirmationPrixTitre.set(
        `Le prix de base passe de ${courant.prix} à ${prix} FCFA alors que ce plat a des variantes.`,
      );
      return;
    }

    this.enregistrerPlat(donnees);
  }

  private enregistrerPlat(donnees: RequetePlatCarte): void {
    this.enregistrementEnCours.set(true);
    this.messageErreur.set(null);

    const courant = this.platCourant();
    const requete = courant
      ? this.service.modifierPlat(this.prefixe(), courant.id, donnees)
      : this.service.creerPlat(this.prefixe(), donnees);

    requete.subscribe({
      next: (plat) => {
        this.enregistrementEnCours.set(false);
        this.platCourant.set(plat);
        this.enregistre.emit();
      },
      error: (erreur: unknown) => {
        this.enregistrementEnCours.set(false);
        this.messageErreur.set(extraireMessageErreur(erreur));
      },
    });
  }

  // ---- Variantes ----

  prixFinal(variante: VarianteCarte): number {
    return this.prixPlatActuel() + variante.prix_supplement;
  }

  prixFinalAffiche(variante: VarianteCarte): string {
    return this.prixFinalSaisi()[variante.id] ?? String(this.prixFinal(variante));
  }

  saisirPrixFinal(variante: VarianteCarte, valeur: string): void {
    this.prixFinalSaisi.update((m) => ({ ...m, [variante.id]: valeur }));
  }

  prixFinalModifie(variante: VarianteCarte): boolean {
    const saisie = this.prixFinalSaisi()[variante.id];
    return saisie !== undefined && saisie !== '' && Number(saisie) !== this.prixFinal(variante);
  }

  enregistrerPrixFinal(variante: VarianteCarte): void {
    const saisie = this.prixFinalSaisi()[variante.id];
    const nouveauFinal = Number(saisie);
    if (saisie === undefined || Number.isNaN(nouveauFinal)) return;

    this.erreurVariantes.set(null);
    this.service
      .modifierVariante(this.prefixe(), variante.id, { prix_supplement: nouveauFinal - this.prixPlatActuel() })
      .subscribe({
        next: () => {
          this.prixFinalSaisi.update((m) => {
            const { [variante.id]: _retire, ...reste } = m;
            return reste;
          });
          this.rafraichirPlat();
        },
        error: (erreur: unknown) => this.erreurVariantes.set(extraireMessageErreur(erreur)),
      });
  }

  ajouterVariante(): void {
    const plat = this.platCourant();
    const nom = this.nouvelleVarianteNom().trim();
    const prixFinalSaisi = Number(this.nouvelleVariantePrixFinal());
    if (!plat || !nom || this.nouvelleVariantePrixFinal().trim() === '' || Number.isNaN(prixFinalSaisi)) return;

    this.erreurVariantes.set(null);
    this.service
      .creerVariante(this.prefixe(), {
        article: plat.id,
        nom,
        prix_supplement: prixFinalSaisi - this.prixPlatActuel(),
        ordre: plat.variantes.length,
      })
      .subscribe({
        next: () => {
          this.nouvelleVarianteNom.set('');
          this.nouvelleVariantePrixFinal.set('');
          this.rafraichirPlat();
        },
        error: (erreur: unknown) => this.erreurVariantes.set(extraireMessageErreur(erreur)),
      });
  }

  supprimerVariante(variante: VarianteCarte): void {
    this.erreurVariantes.set(null);
    this.service.supprimerVariante(this.prefixe(), variante.id).subscribe({
      next: () => this.rafraichirPlat(),
      error: (erreur: unknown) => this.erreurVariantes.set(extraireMessageErreur(erreur)),
    });
  }

  /** Propose de régler le prix de base du plat sur le prix final de cette variante. */
  demanderVarianteParDefaut(variante: VarianteCarte): void {
    const plat = this.platCourant();
    if (!plat || variante.est_par_defaut) return;

    this.ouvrirConfirmationPrix({
      origine: 'variante',
      nouveauPrix: this.prixFinal(variante),
      varianteId: variante.id,
      varianteNom: variante.nom,
      finauxAvant: new Map(plat.variantes.map((v) => [v.id, this.prixFinal(v)])),
    });
    this.confirmationPrixTitre.set(
      `Définir « ${variante.nom} » comme variante par défaut : le prix de base du plat sera réglé sur ${this.prixFinal(variante)} FCFA.`,
    );
  }

  // ---- Confirmation d'un changement de prix (origine : édition directe du prix, ou variante par défaut) ----

  private ouvrirConfirmationPrix(contexte: ContextePrix): void {
    this.confirmationPrixContexte = contexte;
    this.conserverPrixFinaux.set(true);
    this.erreurConfirmationPrix.set(null);
    this.confirmationPrixOuverte.set(true);
  }

  annulerConfirmationPrix(): void {
    if (this.confirmationPrixEnCours()) return;
    this.confirmationPrixOuverte.set(false);
    this.confirmationPrixContexte = null;
  }

  confirmerPrix(): void {
    const ctx = this.confirmationPrixContexte;
    const plat = this.platCourant();
    if (!ctx || !plat || this.confirmationPrixEnCours()) return;

    this.confirmationPrixEnCours.set(true);
    this.erreurConfirmationPrix.set(null);

    const patchPlat$: Observable<PlatCarte> =
      ctx.origine === 'plat' && ctx.donneesPlatEnAttente
        ? this.service.modifierPlat(this.prefixe(), plat.id, ctx.donneesPlatEnAttente)
        : this.service.modifierPlat(this.prefixe(), plat.id, { prix: ctx.nouveauPrix });

    patchPlat$.subscribe({
      next: (platMaj) => {
        this.platCourant.set(platMaj);
        this.prix.set(String(platMaj.prix));
        this.appliquerVariantesApresChangementPrix(ctx, platMaj);
      },
      error: (erreur: unknown) => {
        this.confirmationPrixEnCours.set(false);
        this.erreurConfirmationPrix.set(extraireMessageErreur(erreur));
      },
    });
  }

  private appliquerVariantesApresChangementPrix(ctx: ContextePrix, plat: PlatCarte): void {
    const requetes: Observable<VarianteCarte>[] = [];

    for (const v of plat.variantes) {
      const estLaNouvelleParDefaut = ctx.origine === 'variante' && v.id === ctx.varianteId;
      const champs: Partial<RequeteVarianteCarte> = {};

      if (estLaNouvelleParDefaut) {
        champs.est_par_defaut = true;
        champs.prix_supplement = 0;
      } else {
        if (ctx.origine === 'variante' && v.est_par_defaut) {
          // Ancienne variante par défaut, remplacée par celle choisie : redevient une variante
          // "normale", son supplément peut donc être recalculé comme les autres ci-dessous.
          champs.est_par_defaut = false;
        }
        // La variante par défaut qui LE RESTE (édition directe du prix de base, sans promotion
        // d'une autre variante) n'est jamais recalculée : son prix final est par définition celui
        // du plat, il doit continuer à le suivre automatiquement (supplément toujours nul).
        const resteParDefaut = v.est_par_defaut && ctx.origine === 'plat';
        if (this.conserverPrixFinaux() && !resteParDefaut) {
          const ancienFinal = ctx.finauxAvant.get(v.id);
          if (ancienFinal !== undefined) {
            champs.prix_supplement = ancienFinal - ctx.nouveauPrix;
          }
        }
      }

      if (Object.keys(champs).length > 0) {
        requetes.push(this.service.modifierVariante(this.prefixe(), v.id, champs));
      }
    }

    (requetes.length > 0 ? forkJoin(requetes) : of([])).subscribe({
      next: () => {
        this.confirmationPrixEnCours.set(false);
        this.confirmationPrixOuverte.set(false);
        this.confirmationPrixContexte = null;
        this.enregistre.emit();
        this.rafraichirPlat();
      },
      error: (erreur: unknown) => {
        this.confirmationPrixEnCours.set(false);
        this.erreurConfirmationPrix.set(extraireMessageErreur(erreur));
        // Le prix du plat a déjà changé côté serveur même si ce recalcul a échoué en partie :
        // on resynchronise plutôt que de laisser l'affichage incohérent.
        this.rafraichirPlat();
      },
    });
  }

  private rafraichirPlat(): void {
    const plat = this.platCourant();
    if (!plat) return;
    this.service.obtenirPlat(this.prefixe(), plat.id).subscribe({
      next: (platMaj) => this.platCourant.set(platMaj),
      error: () => undefined,
    });
  }

  // ---- Groupes d'options ----

  ajouterGroupe(): void {
    const plat = this.platCourant();
    const libelle = this.nouveauGroupeLibelle().trim();
    const min = Number(this.nouveauGroupeMin());
    const max = Number(this.nouveauGroupeMax());
    if (!plat || !libelle || Number.isNaN(min) || Number.isNaN(max)) return;

    this.erreurGroupes.set(null);
    this.service
      .creerGroupeOptions(this.prefixe(), { article: plat.id, libelle, min_choix: min, max_choix: max })
      .subscribe({
        next: () => {
          this.nouveauGroupeLibelle.set('');
          this.nouveauGroupeMin.set('1');
          this.nouveauGroupeMax.set('1');
          this.rafraichirPlat();
        },
        error: (erreur: unknown) => this.erreurGroupes.set(extraireMessageErreur(erreur)),
      });
  }

  supprimerGroupe(groupe: GroupeOptionCarte): void {
    this.erreurGroupes.set(null);
    this.service.supprimerGroupeOptions(this.prefixe(), groupe.id).subscribe({
      next: () => this.rafraichirPlat(),
      error: (erreur: unknown) => this.erreurGroupes.set(extraireMessageErreur(erreur)),
    });
  }

  texteNouvelleOption(groupeId: number): string {
    return this.nouvelleOptionNom()[groupeId] ?? '';
  }

  prixNouvelleOption(groupeId: number): string {
    return this.nouvelleOptionPrix()[groupeId] ?? '';
  }

  saisirNomOption(groupeId: number, valeur: string): void {
    this.nouvelleOptionNom.update((m) => ({ ...m, [groupeId]: valeur }));
  }

  saisirPrixOption(groupeId: number, valeur: string): void {
    this.nouvelleOptionPrix.update((m) => ({ ...m, [groupeId]: valeur }));
  }

  ajouterOption(groupeId: number): void {
    const nom = this.texteNouvelleOption(groupeId).trim();
    const prixSupplement = Number(this.prixNouvelleOption(groupeId) || '0');
    if (!nom || Number.isNaN(prixSupplement) || prixSupplement < 0) return;

    this.erreurGroupes.set(null);
    this.service.creerOption(this.prefixe(), { groupe: groupeId, nom, prix_supplement: prixSupplement }).subscribe({
      next: () => {
        this.saisirNomOption(groupeId, '');
        this.saisirPrixOption(groupeId, '');
        this.rafraichirPlat();
      },
      error: (erreur: unknown) => this.erreurGroupes.set(extraireMessageErreur(erreur)),
    });
  }

  supprimerOption(option: OptionCarte): void {
    this.erreurGroupes.set(null);
    this.service.supprimerOption(this.prefixe(), option.id).subscribe({
      next: () => this.rafraichirPlat(),
      error: (erreur: unknown) => this.erreurGroupes.set(extraireMessageErreur(erreur)),
    });
  }
}

import { Component, OnInit, computed, input, output, signal } from '@angular/core';

import { ErreursFormulaire } from '../extraire-erreurs-champs';
import {
  FORMULE_PUB_PAR_DEFAUT,
  FormulePubAdmin,
  OPTIONS_TYPE_AFFICHAGE_PUB,
  RequeteFormulePub,
  TypeAffichagePub,
} from '../../../../../modeles/formule-pub-admin.model';

/** Texte de saisie → entier, ou null si vide / non numérique / non entier. */
function versEntier(valeur: string): number | null {
  const texte = valeur.trim();
  if (texte === '') return null;
  const nombre = Number(texte);
  return Number.isInteger(nombre) ? nombre : null;
}

/**
 * Dialog de création / édition d'une formule publicitaire, en quatre sections (Général,
 * Diffusion, Emplacements, Médias). Ne fait pas l'appel réseau : émet les données saisies, le
 * parent gère l'appel, les erreurs 400 (par champ) et le rechargement.
 */
@Component({
  selector: 'app-dialog-formule-pub',
  imports: [],
  templateUrl: './dialog-formule-pub.html',
  styleUrl: './dialog-formule-pub.scss',
})
export class DialogFormulePub implements OnInit {
  /** Formule à modifier ; null pour une création. */
  readonly formule = input<FormulePubAdmin | null>(null);
  readonly enregistrementEnCours = input(false);
  readonly erreurs = input<ErreursFormulaire | null>(null);

  readonly soumis = output<RequeteFormulePub>();
  readonly annule = output<void>();

  readonly optionsTypes = OPTIONS_TYPE_AFFICHAGE_PUB;

  // Champs numériques en texte : permet un champ vide sans le confondre avec 0.
  readonly nom = signal('');
  readonly prix = signal('');
  readonly priorite = signal('');
  readonly estActive = signal(true);
  readonly dureeJours = signal('');
  readonly passagesParJour = signal('');
  readonly dureeAffichage = signal('');
  readonly accesAffluence = signal(false);
  readonly cible = signal('');
  readonly quota = signal('');
  readonly types = signal<TypeAffichagePub[]>([]);
  readonly passagesParType = signal<Record<string, string>>({});
  readonly nbImagesMax = signal('');
  readonly videoAutorisee = signal(false);
  readonly dureeVideoMax = signal('');

  /** Erreurs de validation locales (avant envoi), par champ. */
  private readonly erreursLocales = signal<Record<string, string>>({});

  readonly nbActives = computed(() => this.formule()?.nb_actives ?? 0);

  /** Édition uniquement : un quota saisi sous le nombre de campagnes actives. */
  readonly quotaSousActives = computed(() => {
    const quota = versEntier(this.quota());
    return this.formule() !== null && quota !== null && quota < this.nbActives();
  });

  ngOnInit(): void {
    const f = this.formule() ?? { ...FORMULE_PUB_PAR_DEFAUT };
    this.nom.set(f.nom);
    this.prix.set(String(f.prix));
    this.priorite.set(String(f.priorite));
    this.estActive.set(f.est_active);
    this.dureeJours.set(String(f.duree_jours));
    this.passagesParJour.set(String(f.passages_par_jour));
    this.dureeAffichage.set(String(f.duree_affichage_secondes));
    this.accesAffluence.set(f.acces_heures_affluence);
    this.cible.set(f.cible_pourcentage_actifs === null ? '' : String(f.cible_pourcentage_actifs));
    this.quota.set(String(f.quota_partenaires));
    this.types.set([...f.types_affichage]);
    this.passagesParType.set(
      Object.fromEntries(Object.entries(f.passages_par_type ?? {}).map(([type, n]) => [type, String(n)])),
    );
    this.nbImagesMax.set(String(f.nb_images_max));
    this.videoAutorisee.set(f.video_autorisee);
    this.dureeVideoMax.set(String(f.duree_video_max_secondes));
  }

  /** Message d'erreur d'un champ : validation locale d'abord, sinon 400 du backend. */
  erreur(champ: string): string | null {
    return this.erreursLocales()[champ] ?? this.erreurs()?.champs[champ] ?? null;
  }

  typeCoche(type: TypeAffichagePub): boolean {
    return this.types().includes(type);
  }

  basculerType(type: TypeAffichagePub, coche: boolean): void {
    this.types.update((liste) =>
      coche ? (liste.includes(type) ? liste : [...liste, type]) : liste.filter((t) => t !== type),
    );
    // Décocher un type retire sa clé de passages_par_type.
    if (!coche) {
      this.passagesParType.update(({ [type]: _retire, ...reste }) => reste);
    }
  }

  /** Saisie courante des passages/jour d'un emplacement (vide si non renseignée). */
  passagesType(type: TypeAffichagePub): string {
    return this.passagesParType()[type] ?? '';
  }

  saisirPassagesType(type: TypeAffichagePub, valeur: string): void {
    this.passagesParType.update((valeurs) => ({ ...valeurs, [type]: valeur }));
  }

  soumettre(): void {
    const erreurs: Record<string, string> = {};

    const nom = this.nom().trim();
    if (!nom) erreurs['nom'] = 'Le nom est requis.';

    const prix = this.prix().trim() === '' ? null : Number(this.prix());
    if (prix === null || Number.isNaN(prix) || prix < 0) erreurs['prix'] = 'Le prix doit être un nombre positif ou nul.';

    const priorite = versEntier(this.priorite());
    if (priorite === null) erreurs['priorite'] = 'La priorité doit être un nombre entier.';

    const dureeJours = versEntier(this.dureeJours());
    if (dureeJours === null || dureeJours < 1) erreurs['duree_jours'] = 'La durée doit être d\'au moins 1 jour.';

    const passagesParJour = versEntier(this.passagesParJour());
    if (passagesParJour === null || passagesParJour < 1) erreurs['passages_par_jour'] = 'Au moins 1 passage par jour.';

    const dureeAffichage = versEntier(this.dureeAffichage());
    if (dureeAffichage === null || dureeAffichage < 1) erreurs['duree_affichage_secondes'] = "La durée d'affichage doit être d'au moins 1 seconde.";

    const quota = versEntier(this.quota());
    if (quota === null || quota < 1) erreurs['quota_partenaires'] = 'Le quota doit être d\'au moins 1 campagne.';

    const nbImages = versEntier(this.nbImagesMax());
    if (nbImages === null || nbImages < 1) erreurs['nb_images_max'] = 'Au moins 1 image.';

    let cible: number | null = null;
    if (this.cible().trim() !== '') {
      cible = versEntier(this.cible());
      if (cible === null || cible < 1 || cible > 100) erreurs['cible_pourcentage_actifs'] = 'La cible doit être comprise entre 1 et 100 %.';
    }

    const dureeVideo = versEntier(this.dureeVideoMax());
    if (this.videoAutorisee() && (dureeVideo === null || dureeVideo < 1)) {
      erreurs['duree_video_max_secondes'] = 'La durée vidéo max doit être d\'au moins 1 seconde.';
    }

    if (this.types().length === 0) erreurs['types_affichage'] = 'Choisissez au moins un emplacement.';

    // Passages par type : uniquement pour les types cochés, champ vide = quota global partagé.
    const passagesParType: Record<string, number> = {};
    for (const type of this.types()) {
      const saisie = this.passagesParType()[type] ?? '';
      if (saisie.trim() === '') continue;
      const valeur = versEntier(saisie);
      if (valeur === null || valeur < 0) {
        erreurs['passages_par_type'] = 'Les passages par type doivent être des entiers positifs ou nuls.';
        break;
      }
      passagesParType[type] = valeur;
    }

    this.erreursLocales.set(erreurs);
    if (Object.keys(erreurs).length > 0) {
      return;
    }

    this.soumis.emit({
      nom,
      prix: prix!,
      priorite: priorite!,
      est_active: this.estActive(),
      duree_jours: dureeJours!,
      passages_par_jour: passagesParJour!,
      duree_affichage_secondes: dureeAffichage!,
      passages_par_type: passagesParType,
      quota_partenaires: quota!,
      acces_heures_affluence: this.accesAffluence(),
      types_affichage: this.types(),
      nb_images_max: nbImages!,
      video_autorisee: this.videoAutorisee(),
      duree_video_max_secondes: dureeVideo ?? FORMULE_PUB_PAR_DEFAUT.duree_video_max_secondes,
      cible_pourcentage_actifs: cible,
    });
  }
}

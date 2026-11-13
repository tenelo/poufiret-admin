import { DestroyRef, signal } from '@angular/core';

/** Son joué par les cloches de notification (espaces partenaire et admin). */
export const CHEMIN_SON_NOTIFICATION = 'sons/notification.wav';

type ConstructeurAudioContext = new () => AudioContext;

function constructeurAudioContext(): ConstructeurAudioContext | null {
  const fenetre = window as typeof window & { webkitAudioContext?: ConstructeurAudioContext };
  return fenetre.AudioContext ?? fenetre.webkitAudioContext ?? null;
}

/**
 * Lecture du son de notification via Web Audio (AudioContext), partagée par les cloches admin et
 * partenaire.
 *
 * Pourquoi Web Audio plutôt qu'un <audio> HTML (ancien mécanisme) : une fois `resume()`-é par un
 * geste utilisateur, un AudioContext reste 'running' même onglet masqué — contrairement à un
 * <audio>, dont la promesse `play()` peut échouer pour des raisons transitoires (y compris en
 * arrière-plan), ce qui remettait `bloque` à `true` même après un déblocage explicite. Ici,
 * `bloque` ne reflète QUE l'état réel du contexte (`!== 'running'`, via `onstatechange`) : un
 * `AudioBufferSourceNode.start()` n'a pas de promesse à échouer, donc plus de « re-blocage » sur
 * un raté ponctuel.
 *
 * Le 2ᵉ paramètre du constructeur (lecteur <audio>) est conservé mais ignoré, pour compatibilité
 * avec les appels existants (cloche partenaire, non modifiée par ce chantier) : son <audio> devient
 * simplement inutilisé, sans rien casser.
 *
 * À instancier dans un contexte d'injection (champ de composant) : les écouteurs et le contexte
 * audio sont retirés/fermés à la destruction du composant.
 */
export class SonNotification {
  private contexte: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private chargementEnCours = false;
  private readonly bloqueInterne = signal(true);

  /** Vrai tant que l'AudioContext n'est pas à l'état 'running' (jamais débloqué, ou suspendu par
   *  le navigateur entre-temps — voir onstatechange) : à utiliser pour afficher un bouton
   *  « Activer le son ». */
  readonly bloque = this.bloqueInterne.asReadonly();

  constructor(
    destroyRef: DestroyRef,
    // Jamais lu : conservé pour compatibilité, voir doc de classe ci-dessus.
    _lecteur?: () => HTMLAudioElement | undefined,
  ) {
    const debloquerSurInteraction = () => this.debloquer();
    document.addEventListener('pointerdown', debloquerSurInteraction, { once: true });
    document.addEventListener('keydown', debloquerSurInteraction, { once: true });
    destroyRef.onDestroy(() => {
      document.removeEventListener('pointerdown', debloquerSurInteraction);
      document.removeEventListener('keydown', debloquerSurInteraction);
      void this.contexte?.close().catch(() => undefined);
    });
  }

  /** Joue le son ; ne fait rien (silencieusement) si le contexte n'est pas 'running' ou que le
   *  fichier n'est pas encore décodé — la cloche visuelle suffit dans ce cas. */
  jouer(): void {
    const contexte = this.contexte;
    if (!contexte || contexte.state !== 'running' || !this.buffer) {
      return;
    }
    const source = contexte.createBufferSource();
    source.buffer = this.buffer;
    source.connect(contexte.destination);
    source.start();
  }

  /**
   * Débloque explicitement la lecture (1re interaction quelconque, ou clic sur « Activer le
   * son ») : crée l'AudioContext s'il n'existe pas encore (et lance le décodage du fichier, une
   * seule fois), puis le reprend (`resume()`) — y compris s'il a été suspendu entre-temps par le
   * navigateur (`onstatechange` remet alors `bloque` à jour dans les deux sens).
   */
  debloquer(): void {
    if (!this.contexte) {
      const Constructeur = constructeurAudioContext();
      if (!Constructeur) {
        return; // Web Audio indisponible : pas de son, repli silencieux (comme avant un blocage).
      }
      this.contexte = new Constructeur();
      this.contexte.onstatechange = () => {
        this.bloqueInterne.set(this.contexte?.state !== 'running');
      };
      this.chargerBuffer();
    }
    void this.contexte.resume().catch(() => undefined);
  }

  private chargerBuffer(): void {
    if (this.chargementEnCours || this.buffer || !this.contexte) {
      return;
    }
    this.chargementEnCours = true;
    fetch(CHEMIN_SON_NOTIFICATION)
      .then((reponse) => reponse.arrayBuffer())
      .then((donnees) => this.contexte!.decodeAudioData(donnees))
      .then((buffer) => {
        this.buffer = buffer;
      })
      .catch(() => undefined)
      .finally(() => {
        this.chargementEnCours = false;
      });
  }
}

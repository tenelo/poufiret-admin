import { DestroyRef } from '@angular/core';

const DELAI_COLLECTE_MS = 50;
const NOM_VERROU = 'poufiret-admin-son';

interface Revendication {
  id: string;
  ts: number;
}

function genererIdOnglet(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Élit un unique onglet « sonneur » parmi les onglets admin ouverts par le même compte, via
 * `navigator.locks` (Web Locks API) : dès que le son d'un onglet se débloque (voir
 * ClocheNotificationsAdmin, `demanderElection`), il demande un verrou partagé et ne le relâche
 * jamais tant qu'il reste ouvert — l'onglet qui l'obtient devient sonneur et joue la sonnerie
 * immédiatement à chaque proposition, sans délai ni `setTimeout` (donc insensible au bridage des
 * minuteurs en arrière-plan). Si l'onglet sonneur se ferme, le navigateur attribue automatiquement
 * le verrou au suivant en attente. Un onglet dont le son n'est pas débloqué ne demande jamais le
 * verrou (c'est `ClocheNotificationsAdmin` qui appelle `demanderElection`, seulement une fois le
 * son débloqué), pour qu'un onglet muet ne soit jamais élu.
 *
 * Repli si `navigator.locks` est indisponible : coordination par `BroadcastChannel` (comme avant
 * ce chantier) — chaque proposition diffuse un horodatage, départagé après une courte fenêtre de
 * collecte (le plus ancien gagne).
 *
 * À instancier dans un contexte d'injection (champ de composant), comme SonNotification : le
 * canal de repli est fermé à la destruction du composant (le verrou, lui, est relâché par le
 * navigateur à la fermeture de l'onglet/la destruction de la page, pas du composant).
 */
export class CoordinateurSonAdmin {
  private readonly idOnglet = genererIdOnglet();
  private readonly utiliseVerrous = typeof navigator !== 'undefined' && !!navigator.locks;
  private readonly canal = !this.utiliseVerrous && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('poufiret-admin-notifications-son')
    : null;
  private revendications: Revendication[] = [];
  private estSonneur = false;
  private electionDemandee = false;

  constructor(
    destroyRef: DestroyRef,
    // Nom du verrou : paramétrable uniquement pour isoler les tests les uns des autres (un verrou
    // jamais relâché pollueraient sinon les cas suivants) ; toujours NOM_VERROU en production.
    private readonly nomVerrou: string = NOM_VERROU,
  ) {
    this.canal?.addEventListener('message', this.surMessage);
    destroyRef.onDestroy(() => {
      this.canal?.removeEventListener('message', this.surMessage);
      this.canal?.close();
    });
  }

  /** À appeler quand le son de cet onglet devient débloqué : demande le verrou, une seule fois. */
  demanderElection(): void {
    if (!this.utiliseVerrous || this.electionDemandee) {
      return;
    }
    this.electionDemandee = true;
    void navigator.locks.request(this.nomVerrou, () => {
      this.estSonneur = true;
      // Jamais résolue : le verrou reste tenu tant que cet onglet est ouvert (fermeture = relâché
      // automatiquement par le navigateur, qui l'attribue alors au suivant en attente).
      return new Promise<void>(() => undefined);
    });
  }

  /** Propose de sonner ; `jouer` n'est appelé que par l'onglet élu (ou directement en repli). */
  proposerSonner(jouer: () => void): void {
    if (this.utiliseVerrous) {
      if (this.estSonneur) {
        jouer();
      }
      return;
    }

    if (!this.canal) {
      jouer();
      return;
    }

    const revendication: Revendication = { id: this.idOnglet, ts: Date.now() };
    this.revendications = [revendication];
    this.canal.postMessage(revendication);

    setTimeout(() => {
      const gagnante = [...this.revendications].sort(
        (a, b) => a.ts - b.ts || a.id.localeCompare(b.id),
      )[0];
      this.revendications = [];
      if (gagnante?.id === this.idOnglet) {
        jouer();
      }
    }, DELAI_COLLECTE_MS);
  }

  private readonly surMessage = (evenement: MessageEvent<Revendication>): void => {
    this.revendications.push(evenement.data);
  };
}

import { DestroyRef } from '@angular/core';

const DELAI_COLLECTE_MS = 50;

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
 * Coordination du son entre les onglets admin ouverts par le même compte : les compteurs se
 * mettent à jour dans tous les onglets (voir ClocheNotificationsAdmin), mais un seul doit sonner.
 * Chaque onglet qui propose de sonner diffuse un horodatage sur un BroadcastChannel partagé ; après
 * une courte fenêtre de collecte, seul l'onglet dont la revendication est la plus ancienne joue
 * réellement le son (égalité d'horodatage départagée par l'id, généré une fois par onglet).
 * Repli : si BroadcastChannel n'est pas disponible, l'onglet sonne directement (comme avant cette
 * coordination).
 * À instancier dans un contexte d'injection (champ de composant), comme SonNotification : le
 * canal est fermé à la destruction du composant.
 */
export class CoordinateurSonAdmin {
  private readonly idOnglet = genererIdOnglet();
  private readonly canal = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('poufiret-admin-notifications-son')
    : null;
  private revendications: Revendication[] = [];

  constructor(destroyRef: DestroyRef) {
    this.canal?.addEventListener('message', this.surMessage);
    destroyRef.onDestroy(() => {
      this.canal?.removeEventListener('message', this.surMessage);
      this.canal?.close();
    });
  }

  /** Propose de sonner ; `jouer` n'est appelé que si cet onglet remporte la coordination. */
  proposerSonner(jouer: () => void): void {
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

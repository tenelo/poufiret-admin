import { CoordinateurSonAdmin } from './coordinateur-son-admin';

/** DestroyRef minimal : seul `onDestroy` est utilisé par CoordinateurSonAdmin. */
function destroyRefSimule(): { onDestroy: (callback: () => void) => void } {
  return { onDestroy: () => undefined };
}

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('CoordinateurSonAdmin', () => {
  it('un seul des deux onglets sonne pour une même proposition', async () => {
    const coordinateurA = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const coordinateurB = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const jouerA = jasmine.createSpy('jouerA');
    const jouerB = jasmine.createSpy('jouerB');

    coordinateurA.proposerSonner(jouerA);
    coordinateurB.proposerSonner(jouerB);

    await attendre(150);

    const nbAppels = (jouerA.calls.count() + jouerB.calls.count());
    expect(nbAppels).toBe(1);
  });

  it('sonne directement quand BroadcastChannel est indisponible', () => {
    const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;

    const coordinateur = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const jouer = jasmine.createSpy('jouer');
    coordinateur.proposerSonner(jouer);

    expect(jouer).toHaveBeenCalled();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
  });

  it('un onglet seul sonne bien après la fenêtre de collecte', async () => {
    const coordinateur = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const jouer = jasmine.createSpy('jouer');

    coordinateur.proposerSonner(jouer);
    expect(jouer).not.toHaveBeenCalled();

    await attendre(150);
    expect(jouer).toHaveBeenCalled();
  });
});

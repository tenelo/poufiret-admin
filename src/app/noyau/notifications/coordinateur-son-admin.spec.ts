import { CoordinateurSonAdmin } from './coordinateur-son-admin';

/** DestroyRef minimal : seul `onDestroy` est utilisé par CoordinateurSonAdmin. */
function destroyRefSimule(): { onDestroy: (callback: () => void) => void } {
  return { onDestroy: () => undefined };
}

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Un verrou Web Locks obtenu par CoordinateurSonAdmin n'est JAMAIS relâché (comportement voulu :
 * l'onglet sonneur le garde tant qu'il reste ouvert) — chaque test doit donc utiliser un nom de
 * verrou distinct, sous peine de rester bloqué derrière le verrou (jamais libéré) d'un test
 * précédent. `nomVerrouUnique()` isole chaque test du suivant.
 */
let compteurNomVerrou = 0;
function nomVerrouUnique(): string {
  compteurNomVerrou += 1;
  return `test-son-admin-${compteurNomVerrou}`;
}

describe('CoordinateurSonAdmin — navigator.locks (chemin principal, Chrome le supporte)', () => {
  it("sonne une fois élu (demanderElection), sans délai ni setTimeout côté décision", async () => {
    const coordinateur = new CoordinateurSonAdmin(destroyRefSimule() as never, nomVerrouUnique());
    const jouer = jasmine.createSpy('jouer');

    coordinateur.demanderElection();
    await attendre(20); // le temps que navigator.locks accorde le verrou (aucune contention).
    coordinateur.proposerSonner(jouer);

    expect(jouer).toHaveBeenCalled();
  });

  it("ne sonne pas tant que l'élection n'a pas été demandée (son encore bloqué)", () => {
    const coordinateur = new CoordinateurSonAdmin(destroyRefSimule() as never, nomVerrouUnique());
    const jouer = jasmine.createSpy('jouer');

    coordinateur.proposerSonner(jouer);

    expect(jouer).not.toHaveBeenCalled();
  });

  it('un seul des deux onglets sonne : le second reste muet tant que le premier est ouvert', async () => {
    const nomVerrou = nomVerrouUnique();
    const coordinateurA = new CoordinateurSonAdmin(destroyRefSimule() as never, nomVerrou);
    const coordinateurB = new CoordinateurSonAdmin(destroyRefSimule() as never, nomVerrou);
    const jouerA = jasmine.createSpy('jouerA');
    const jouerB = jasmine.createSpy('jouerB');

    coordinateurA.demanderElection();
    coordinateurB.demanderElection();
    await attendre(20);

    coordinateurA.proposerSonner(jouerA);
    coordinateurB.proposerSonner(jouerB);

    expect(jouerA).toHaveBeenCalled();
    expect(jouerB).not.toHaveBeenCalled();
  });

  it('demanderElection() est sans effet si appelée plusieurs fois (une seule demande de verrou)', async () => {
    const coordinateur = new CoordinateurSonAdmin(destroyRefSimule() as never, nomVerrouUnique());
    const jouer = jasmine.createSpy('jouer');

    coordinateur.demanderElection();
    coordinateur.demanderElection();
    coordinateur.demanderElection();
    await attendre(20);
    coordinateur.proposerSonner(jouer);

    expect(jouer).toHaveBeenCalledTimes(1);
  });
});

describe('CoordinateurSonAdmin — repli BroadcastChannel (navigator.locks indisponible)', () => {
  let locksOriginal: unknown;

  beforeEach(() => {
    locksOriginal = (navigator as unknown as { locks?: unknown }).locks;
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'locks', { value: locksOriginal, configurable: true });
  });

  it('sonne directement quand BroadcastChannel est aussi indisponible', () => {
    const canalOriginal = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;

    const coordinateur = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const jouer = jasmine.createSpy('jouer');
    coordinateur.proposerSonner(jouer);

    expect(jouer).toHaveBeenCalled();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = canalOriginal;
  });

  it('un seul des deux onglets sonne pour une même proposition (BroadcastChannel)', async () => {
    const coordinateurA = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const coordinateurB = new CoordinateurSonAdmin(destroyRefSimule() as never);
    const jouerA = jasmine.createSpy('jouerA');
    const jouerB = jasmine.createSpy('jouerB');

    coordinateurA.proposerSonner(jouerA);
    coordinateurB.proposerSonner(jouerB);

    await attendre(150);

    const nbAppels = jouerA.calls.count() + jouerB.calls.count();
    expect(nbAppels).toBe(1);
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

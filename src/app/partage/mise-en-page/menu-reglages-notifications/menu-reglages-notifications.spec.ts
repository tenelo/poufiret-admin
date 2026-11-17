import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { MenuReglagesNotifications } from './menu-reglages-notifications';
import { NotificationsPushEtatService } from '../../../noyau/notifications/notifications-push-etat.service';

/**
 * Visibilité (masqué tant qu'aucune action n'est utile, reste ouvert tant que l'utilisateur ne l'a
 * pas refermé) et relais du clic « Activer le son » — couvre la régression du bug de mise en page
 * (bloc affiché en permanence dans l'en-tête, débordement, voir ClocheNotificationsAdmin).
 */
describe('MenuReglagesNotifications', () => {
  let notificationsPushFaux: ReturnType<typeof creerNotificationsPushFaux>;
  let fixture: ComponentFixture<MenuReglagesNotifications>;
  let component: MenuReglagesNotifications;

  function creerNotificationsPushFaux() {
    return {
      support: signal<'supporte' | 'ios_non_installe' | 'non_supporte'>('non_supporte'),
      permission: signal<'activee' | 'bloquee' | 'en_attente'>('en_attente'),
      actifEtAutorise: signal(false),
      enCours: signal(false),
      messageErreur: signal<string | null>(null),
      messageSucces: signal<string | null>(null),
      activer: () => undefined,
      desactiverSurCetAppareil: () => undefined,
      envoyerTest: () => undefined,
    };
  }

  async function creer(sonBloque: boolean): Promise<void> {
    notificationsPushFaux = creerNotificationsPushFaux();

    await TestBed.configureTestingModule({
      imports: [MenuReglagesNotifications],
      providers: [{ provide: NotificationsPushEtatService, useValue: notificationsPushFaux }],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuReglagesNotifications);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sonBloque', sonBloque);
    fixture.detectChanges();
  }

  it("ne s'affiche pas quand rien n'est à faire (son débloqué, push non supporté)", async () => {
    await creer(false);
    expect(fixture.nativeElement.querySelector('.bouton-reglages')).toBeNull();
  });

  it('affiche un point d’alerte quand le son est bloqué', async () => {
    await creer(true);
    expect(fixture.nativeElement.querySelector('.bouton-reglages')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pastille-alerte')).not.toBeNull();
  });

  it('affiche un point d’alerte quand le push est supporté mais pas encore activé (son débloqué)', async () => {
    await creer(false);
    notificationsPushFaux.support.set('supporte');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bouton-reglages')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pastille-alerte')).not.toBeNull();
  });

  it('aucun point d’alerte une fois le push activé et autorisé (rien à faire)', async () => {
    await creer(false);
    notificationsPushFaux.support.set('supporte');
    notificationsPushFaux.actifEtAutorise.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bouton-reglages')).toBeNull();
  });

  it("ouvre le panneau au clic et relaie activerSon lors d'un clic sur « Activer le son »", async () => {
    await creer(true);
    let nbEmissions = 0;
    component.activerSon.subscribe(() => nbEmissions++);

    (fixture.nativeElement.querySelector('.bouton-reglages') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.panneau-reglages')).not.toBeNull();

    (fixture.nativeElement.querySelector('.bouton-activer-son') as HTMLButtonElement).click();
    expect(nbEmissions).toBe(1);
  });

  it("reste affiché (ouvert) même si plus rien n'est à faire entre-temps, le temps de lire le résultat", async () => {
    await creer(true); // son bloqué -> visible.
    (fixture.nativeElement.querySelector('.bouton-reglages') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentRef.setInput('sonBloque', false); // plus rien à faire.
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bouton-reglages')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.panneau-reglages')).not.toBeNull();
  });

  it('se referme sur un clic en dehors du menu', async () => {
    await creer(true);
    (fixture.nativeElement.querySelector('.bouton-reglages') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.ouvert()).toBeTrue();

    document.body.click();
    expect(component.ouvert()).toBeFalse();
  });

  it('se referme avec Échap', async () => {
    await creer(true);
    (fixture.nativeElement.querySelector('.bouton-reglages') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.ouvert()).toBeTrue();

    component.fermer();
    expect(component.ouvert()).toBeFalse();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // BandeauNouvelleVersion (via MiseAJourService) injecte SwUpdate, qui a besoin de
      // NgswCommChannel — fourni par provideServiceWorker, même désactivé (comme en test).
      providers: [provideServiceWorker('ngsw-worker.js', { enabled: false })],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

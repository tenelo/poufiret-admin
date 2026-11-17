import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { of } from 'rxjs';

import { CoquilleApplication } from './coquille-application';

describe('CoquilleApplication', () => {
  let component: CoquilleApplication;
  let fixture: ComponentFixture<CoquilleApplication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoquilleApplication],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        // NotificationsPushEtatService (root) est injecté ici (voir coquille-application.ts) : SwPush
        // réel exige provideServiceWorker, absent des tests — même approche que dans
        // mise-a-jour.service.spec.ts (SwUpdate) et cloche-notifications-admin.spec.ts.
        {
          provide: SwPush,
          useValue: {
            isEnabled: false,
            subscription: of(null),
            notificationClicks: of(),
            requestSubscription: () => Promise.reject(new Error('non supporté (test)')),
            unsubscribe: () => Promise.resolve(),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoquilleApplication);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

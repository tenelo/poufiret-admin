import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CoquilleApplication } from './coquille-application';

describe('CoquilleApplication', () => {
  let component: CoquilleApplication;
  let fixture: ComponentFixture<CoquilleApplication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoquilleApplication],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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

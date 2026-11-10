import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BarreLaterale } from './barre-laterale';

describe('BarreLaterale', () => {
  let component: BarreLaterale;
  let fixture: ComponentFixture<BarreLaterale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarreLaterale],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarreLaterale);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

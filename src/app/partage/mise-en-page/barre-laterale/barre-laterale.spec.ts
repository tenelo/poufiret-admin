import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarreLaterale } from './barre-laterale';

describe('BarreLaterale', () => {
  let component: BarreLaterale;
  let fixture: ComponentFixture<BarreLaterale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarreLaterale]
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

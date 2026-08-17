import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnTete } from './en-tete';

describe('EnTete', () => {
  let component: EnTete;
  let fixture: ComponentFixture<EnTete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnTete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnTete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoquilleApplication } from './coquille-application';

describe('CoquilleApplication', () => {
  let component: CoquilleApplication;
  let fixture: ComponentFixture<CoquilleApplication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoquilleApplication]
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

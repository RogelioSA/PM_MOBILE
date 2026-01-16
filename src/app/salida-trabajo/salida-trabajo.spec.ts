import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalidaTrabajo } from './salida-trabajo';

describe('SalidaTrabajo', () => {
  let component: SalidaTrabajo;
  let fixture: ComponentFixture<SalidaTrabajo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalidaTrabajo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalidaTrabajo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

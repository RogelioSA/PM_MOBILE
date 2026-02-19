import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Recepcionvehiculos } from './recepcionvehiculos';

describe('Recepcionvehiculos', () => {
  let component: Recepcionvehiculos;
  let fixture: ComponentFixture<Recepcionvehiculos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recepcionvehiculos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Recepcionvehiculos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

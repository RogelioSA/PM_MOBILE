import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MantenimientoEstados } from './mantenimiento-estados';

describe('MantenimientoEstados', () => {
  let component: MantenimientoEstados;
  let fixture: ComponentFixture<MantenimientoEstados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MantenimientoEstados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MantenimientoEstados);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

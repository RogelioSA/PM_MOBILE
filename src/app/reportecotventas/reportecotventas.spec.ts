import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reportecotventas } from './reportecotventas';

describe('Reportecotventas', () => {
  let component: Reportecotventas;
  let fixture: ComponentFixture<Reportecotventas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportecotventas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reportecotventas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

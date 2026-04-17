import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RendicionGastos } from './rendicion-gastos';

describe('RendicionGastos', () => {
  let component: RendicionGastos;
  let fixture: ComponentFixture<RendicionGastos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RendicionGastos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RendicionGastos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

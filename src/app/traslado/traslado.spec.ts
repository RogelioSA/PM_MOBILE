import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Traslado } from './traslado';

describe('Traslado', () => {
  let component: Traslado;
  let fixture: ComponentFixture<Traslado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Traslado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Traslado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

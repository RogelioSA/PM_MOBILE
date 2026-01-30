import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Detallechecklist } from './detallechecklist';

describe('Detallechecklist', () => {
  let component: Detallechecklist;
  let fixture: ComponentFixture<Detallechecklist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Detallechecklist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Detallechecklist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

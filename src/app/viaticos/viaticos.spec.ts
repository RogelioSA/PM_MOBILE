import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viaticos } from './viaticos';

describe('Viaticos', () => {
  let component: Viaticos;
  let fixture: ComponentFixture<Viaticos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Viaticos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viaticos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

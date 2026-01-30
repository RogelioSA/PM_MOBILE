import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Listarchecklist } from './listarchecklist';

describe('Listarchecklist', () => {
  let component: Listarchecklist;
  let fixture: ComponentFixture<Listarchecklist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Listarchecklist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Listarchecklist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

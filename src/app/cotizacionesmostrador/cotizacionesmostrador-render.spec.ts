import { NgZone, provideZoneChangeDetection, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AutoComplete } from 'primeng/autocomplete';
import { Subject } from 'rxjs';
import { Cotizacionesmostrador } from './cotizacionesmostrador';
import { Master } from '../services/master';
import { Api } from '../services/api';

for (const zoneless of [false, true]) {
describe(`Cotizacionesmostrador autocomplete Angular 22 (${zoneless ? 'zoneless' : 'Zone.js'})`, () => {
  let fixture: ComponentFixture<Cotizacionesmostrador>;
  let component: Cotizacionesmostrador;
  let autocomplete: AutoComplete;
  let response: Subject<any>;
  let master: jasmine.SpyObj<Master>;

  beforeEach(async () => {
    response = new Subject<any>();
    master = jasmine.createSpyObj('Master', ['searchProducts']);
    master.searchProducts.and.returnValue(response);
    await TestBed.configureTestingModule({
      imports: [Cotizacionesmostrador],
      providers: [zoneless ? provideZonelessChangeDetection() : provideZoneChangeDetection({ eventCoalescing: true }),
        { provide: Master, useValue: master }, { provide: Api, useValue: {} }]
    }).overrideComponent(Cotizacionesmostrador, {
      set: { template: `<p-autocomplete [(ngModel)]="filaActiva.inputDescripcion"
        [suggestions]="productosSugeridos" optionLabel="nombre"
        (completeMethod)="buscarProductos($event)" />` }
    }).compileComponents();
    fixture = TestBed.createComponent(Cotizacionesmostrador);
    component = fixture.componentInstance;
    spyOn(component, 'cargarSucursales');
    spyOn(component, 'obtenerUsuarioActual').and.returnValue('ADMINISTRADOR');
    component.cabecera.idSucursal = '001';
    fixture.autoDetectChanges();
    await fixture.whenStable();
    autocomplete = fixture.debugElement.query(By.directive(AutoComplete)).componentInstance;
    (fixture.nativeElement.querySelector('input') as HTMLInputElement).focus();
  });

  afterEach(() => fixture.destroy());

  async function startSearch(query = 'FILTRO') {
    autocomplete.search(new Event('input'), query, 'input');
    await fixture.whenStable();
    expect(autocomplete.loading).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-p-icon="spinner"]')).not.toBeNull();
  }

  it('renders the results and stops the spinner after an out-of-zone response without another input event', async () => {
    await startSearch();
    TestBed.inject(NgZone).runOutsideAngular(() => response.next([
      { idProducto: '01109AL', nombre: 'FILTRO DE ACEITE' }
    ]));
    await fixture.whenStable();
    expect(autocomplete.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-p-icon="spinner"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('FILTRO DE ACEITE');
  });

  it('stops the spinner for empty responses and repeated arrays', async () => {
    const results: any[] = [];
    await startSearch();
    response.next(results);
    await fixture.whenStable();
    expect(autocomplete.loading).toBeFalse();
    await startSearch();
    response.next(results);
    await fixture.whenStable();
    expect(autocomplete.loading).toBeFalse();
    expect(component.buscandoProducto).toBeFalse();
  });

  it('stops the spinner and clears suggestions on request failure', async () => {
    await startSearch();
    response.error(new Error('network'));
    await fixture.whenStable();
    expect(autocomplete.loading).toBeFalse();
    expect(component.productosSugeridos).toEqual([]);
    expect(component.buscandoProducto).toBeFalse();
  });

  it('stops the spinner when required query context is missing', async () => {
    component.cabecera.idSucursal = '';
    autocomplete.search(new Event('input'), 'FILTRO', 'input');
    await fixture.whenStable();
    expect(master.searchProducts).not.toHaveBeenCalled();
    expect(autocomplete.loading).toBeFalse();
  });
});

}

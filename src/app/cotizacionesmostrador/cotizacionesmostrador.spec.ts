import { ChangeDetectorRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { Cotizacionesmostrador } from './cotizacionesmostrador';
import { Master } from '../services/master';
import { Api } from '../services/api';

describe('Cotizacionesmostrador', () => {
  let component: Cotizacionesmostrador;
  let master: jasmine.SpyObj<Master>;

  beforeEach(() => {
    master = jasmine.createSpyObj('Master', ['searchProducts', 'saldoAlmacenProducto']);
    component = new Cotizacionesmostrador(new MessageService(), {} as Api, master,
      { markForCheck: () => {} } as ChangeDetectorRef);
  });

  it('retains the API discount as a ceiling and starts without a discount', () => {
    const fila = component.filaVacia();
    component.seleccionarProducto({ idProducto: ' 001 ', nombre: 'Filtro', precioUnitario: '100', descuentoPct: '12.50' }, fila);
    expect(fila.descuentoMaximo).toBe(12.5);
    expect(fila.descuentoPct).toBe(0);
    fila.descuentoPct = 20;
    component.recalc(fila);
    expect(fila.descuentoPct).toBe(12.5);
    expect(fila.valor).toBe(87.5);
    fila.descuentoPct = -5;
    component.recalc(fila);
    expect(fila.descuentoPct).toBe(0);
  });

  it('prevents discounts when the API returns zero', () => {
    const fila = component.filaVacia();
    component.seleccionarProducto({ idProducto: '001', descuentoPct: '0.00' }, fila);
    fila.descuentoPct = 10;
    component.recalc(fila);
    expect(fila.descuentoPct).toBe(0);
  });

  it('includes currency, branch and current user in product searches', () => {
    spyOn(component, 'obtenerUsuarioActual').and.returnValue('ADMINISTRADOR');
    component.cabecera.idSucursal = '001';
    component.cabecera.moneda = 'USD';
    master.searchProducts.and.returnValue(of([]));
    component.buscarProductos({ query: '01109AL' });
    expect(master.searchProducts).toHaveBeenCalledWith('01109AL', '02', '001', 'ADMINISTRADOR');
  });

  it('does not call the API without the required branch and user', () => {
    component.buscarProductos({ query: '01109AL' });
    expect(master.searchProducts).not.toHaveBeenCalled();
  });

  it('opens the dialog and displays stock from every warehouse', () => {
    const fila = { ...component.filaVacia(), idProducto: '01109AL' };
    const stock = [{ sucursal: 'Principal', almacen: 'Repuestos', stock: 28 },
      { sucursal: 'Puno', almacen: 'Repuestos', stock: 5 }];
    master.saldoAlmacenProducto.and.returnValue(of(stock));
    component.verDisponibilidad(fila);
    expect(master.saldoAlmacenProducto).toHaveBeenCalledWith('01109AL');
    expect(component.disponibilidadVisible).toBeTrue();
    expect(component.stockAlmacenes).toEqual(stock);
    expect(component.cargandoDisponibilidad).toBeFalse();
  });

  it('cancels the previous stock request and clears old results on errors', () => {
    const previous = new Subject<any>();
    master.saldoAlmacenProducto.and.returnValue(previous);
    component.verDisponibilidad({ ...component.filaVacia(), idProducto: 'A' });
    master.saldoAlmacenProducto.and.returnValue(throwError(() => new Error('network')));
    component.verDisponibilidad({ ...component.filaVacia(), idProducto: 'B' });
    previous.next([{ stock: 99 }]);
    expect(component.stockAlmacenes).toEqual([]);
    expect(component.errorDisponibilidad).toContain('No se pudo');
    expect(component.cargandoDisponibilidad).toBeFalse();
  });
});

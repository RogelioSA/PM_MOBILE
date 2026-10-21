import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { Master } from './master';
import { Auth } from './auth';

describe('Master consultas de productos', () => {
  let http: jasmine.SpyObj<HttpClient>;
  let service: Master;
  beforeEach(() => {
    http = jasmine.createSpyObj('HttpClient', ['get']);
    http.get.and.returnValue(of([]));
    service = new Master(http, { getHeaders: () => new HttpHeaders() } as Auth);
  });

  it('sends all required search parameters with their exact API names', () => {
    service.searchProducts('01109AL', '02', '001', 'ADMINISTRADOR').subscribe();
    const [url, options] = http.get.calls.mostRecent().args as any[];
    expect(url).toContain('/Car/buscarProductos');
    expect(options.params.keys().sort()).toEqual(['descripcion', 'idmoneda', 'idsucursal', 'usuario']);
    expect(options.params.get('descripcion')).toBe('01109AL');
    expect(options.params.get('idmoneda')).toBe('02');
    expect(options.params.get('idsucursal')).toBe('001');
    expect(options.params.get('usuario')).toBe('ADMINISTRADOR');
  });

  it('trims the stock product identifier and uses the stock endpoint', () => {
    service.saldoAlmacenProducto('00001109AL          ').subscribe();
    const [url, options] = http.get.calls.mostRecent().args as any[];
    expect(url).toContain('/Car/saldoAlmacenProducto');
    expect(options.params.get('idProducto')).toBe('00001109AL');
  });
});

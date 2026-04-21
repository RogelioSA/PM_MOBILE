import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Master {
  private baseUrl = environment.apiUrl;
  private secondaryApiUrlDNI = 'https://api.factiliza.com/v1/dni/info';
  private secondaryApiUrlRUC = 'https://api.factiliza.com/v1/ruc/info';
  private tokenAPI = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzODg5NyIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6ImNvbnN1bHRvciJ9.1nvg8UKFQFIc2JNZkD5lmzCZsR4-_PH7aIHiRvPhkU0';
  
  constructor(
    private https: HttpClient,
    private authService: Auth
  ) {}

  // Sucursales
  getSucursales(): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/ResumeBySeller/GetSucursal`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Almacenes por sucursal
  getAlmacenesPorSucursal(idsucursal: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/Almacen/${idsucursal}`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Órdenes de producción
  getOrdenesProduccionPorSucursal(idTaller: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/Workshop/ListarOrdenesProduccion`,
      {
        headers: this.authService.getHeaders(),
        params: new HttpParams().set('idTaller', idTaller)
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Vehículo por VIN
  getCarPorVin(vin: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/Car/${vin}`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  //vehiculo por idproducto
  getCarPorIdProducto(idProduct: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/Car/product`,
      {
        headers: this.authService.getHeaders(),
        params: { idProduct }
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Marcas
  getMarcas(): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/ResumeBySeller/GetBrands`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Modelos por marca
  getModelosPorMarca(idBrand: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/ResumeBySeller/GetModelsByBrand?idBrand=${idBrand}`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Colores
  getColores(): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/ResumeBySeller/GetColors`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Proveedores
  listarProveedorTramite(): Observable<any> {
    return this.https.get<any>(
      `${this.baseUrl}/ResumeBySeller/listarProveedorTramite`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  buscarProveedores(filtro: string): Observable<any> {
    const queryParams = new HttpParams()
      .set('filtro', filtro);

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/BuscarProveedores`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  buscarDocumentoCobrarPagar(documento: string): Observable<any> {
    const queryParams = new HttpParams()
      .set('documento', documento);

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/BuscarDocumentoCobrarPagar`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  factiliza(nroDocumento: string): Observable<any> {
    let apiUrl = '';

    // Validación más clara
    if (!nroDocumento || !/^\d+$/.test(nroDocumento)) {
      return throwError(() => new Error('Documento inválido'));
    }

    if (nroDocumento.length === 8) {
      apiUrl = this.secondaryApiUrlDNI;
    } else if (nroDocumento.length === 11) {
      apiUrl = this.secondaryApiUrlRUC;
    } else {
      return throwError(() => new Error('Debe tener 8 (DNI) o 11 (RUC) dígitos'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.tokenAPI}`
    });

    return this.https.get<any>(`${apiUrl}/${nroDocumento}`, { headers }).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error en Factiliza:', error);
        return throwError(() => error);
      })
    );
  }
}
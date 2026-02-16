import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root'
})
export class Master {
  private baseUrl = environment.apiUrl;

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
}
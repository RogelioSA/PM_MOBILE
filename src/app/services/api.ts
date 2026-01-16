import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface RegistroSalidaOTDetalle {
  idproducto: string;
  cantidad: number;
}

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = environment.apiUrl;

  constructor(
    private https: HttpClient,
    private authService: Auth
  ) {}

  // Sucursales
  getSucursales(): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/ResumeBySeller/GetSucursal`,
      {
        headers: this.authService.getHeaders()
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Almacenes por sucursal
  getAlmacenesPorSucursal(idsucursal: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/Almacen/${idsucursal}`,
      {
        headers: this.authService.getHeaders()
      }
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

  // Obtener vehículo por VIN
  getCarPorVin(vin: string): Observable<any> {
    return this.https.get(
      `${this.baseUrl}/Car/${vin}`,
      {
        headers: this.authService.getHeaders()
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  // Registro de salida OT
  registroSalidaOT(
    idsucursal: string,
    idalmacen: string,
    idordentrabajo: string,
    fecha: string,
    detalle: RegistroSalidaOTDetalle[]
  ): Observable<any> {
    const params = new HttpParams()
      .set('idsucursal', idsucursal)
      .set('idalmacen', idalmacen)
      .set('idordentrabajo', idordentrabajo)
      .set('fecha', fecha);

    return this.https.post(
      `${this.baseUrl}/Car/registroSalidaOT`,
      detalle,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }
}

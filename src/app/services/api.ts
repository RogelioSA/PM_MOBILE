import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError,switchMap  } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface RegistroSalidaOTDetalle {
  idproducto: string;
  cantidad: number;
}

export interface ChecklistEquipamiento {
  codigo: string;
  valor: string | null;
}


export interface ChecklistPDI {
  Sucursal: string;
  Almacen: string;
  Marca: string;
  Modelo: string;
  Color: string | null;
  Kilometraje: string;
  Nuevo: boolean;
  Activo: boolean;
  NroChasis: string;
  NroStock: string;
  Equipamiento: ChecklistEquipamiento[];
  Transportista: string;
  Conductor: string;
  FechaLlegada: Date | null;
  Observaciones: string;
  NombreTecnico: string;
  FechaRecepcion: Date | null;
}

export interface SucursalRecepcion {
  id: string;
  nombre: string;
}

export interface AlmacenRecepcion {
  id: string;
  nombre: string;
}

export interface VehiculoRecepcion {
  vin: string;
  idVehiculo: string;
  marca: string;
  modelo: string;
  color: string;
}

export interface VehiculoRecepcionPayload {
  idEmpresa: string;
  idVehiculo: string;
  idSucursal: string;
  idAlmacen: string;
  fecha: string;
}

export interface DocumentoRecepcion {
  tipoDoc?: string;
  serie?: string;
  numeroDocumento?: string;
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

  registroTransferenciaAlmacenes(
    idsucursal: string,
    idalmacen: string,
    idsucursaldestino: string,
    idalmacendestino: string,
    fecha: string,
    detalle: RegistroSalidaOTDetalle[]
  ): Observable<any> {

    const params = new HttpParams()
      .set('idsucursal', idsucursal)
      .set('idalmacen', idalmacen)
      .set('idsucursaldestino', idsucursaldestino)
      .set('idalmacendestino', idalmacendestino)
      .set('fecha', fecha);

    return this.https.post(
      `${this.baseUrl}/Car/registroTransferenciaAlmacenes`,
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

  guardarChecklistPDI(checklist: ChecklistPDI): Observable<any> {
  // Parámetros en query string
  let params = new HttpParams()
    .set('sucursal', checklist.Sucursal)
    .set('almacen', checklist.Almacen)
    .set('marca', checklist.Marca)
    .set('modelo', checklist.Modelo)
    .set('kilometraje', checklist.Kilometraje)
    .set('nuevo', checklist.Nuevo.toString())
    .set('activo', checklist.Activo.toString())
    .set('nroChasis', checklist.NroChasis)
    .set('nroStock', checklist.NroStock)
    .set('transportista', checklist.Transportista)
    .set('conductor', checklist.Conductor)
    .set('observaciones', checklist.Observaciones)
    .set('nombreTecnico', checklist.NombreTecnico);

  // Agregar parámetros opcionales
  if (checklist.Color) {
    params = params.set('color', checklist.Color);
  }
  
  if (checklist.FechaLlegada) {
    params = params.set('fechaLlegada', new Date(checklist.FechaLlegada).toISOString());
  }
  
  if (checklist.FechaRecepcion) {
    params = params.set('fechaRecepcion', new Date(checklist.FechaRecepcion).toISOString());
  }

  // Solo el equipamiento va en el body
  const body = checklist.Equipamiento;

  return this.https.post(
    `${this.baseUrl}/Car/registroChecklistPDI`,
    body,
    { 
      headers: this.authService.getHeaders(),
      params 
    }
  ).pipe(
    map((response: any) => response),
    catchError(error => throwError(() => error))
  );
}

  subirArchivoChecklist(
    stock: string,
    archivo: File,
    tipoArchivo: string
  ): Observable<any> {
    const carpeta = `Chk_${stock}`;
    
    // Determinar el tipo MIME correcto
    let mimeType = 'application/octet-stream';
    
    if (tipoArchivo === 'imagen') {
      mimeType = archivo.type || 'image/jpeg';
    } else if (tipoArchivo === 'pdf') {
      mimeType = 'application/pdf';
    }
    
    const params = new HttpParams()
      .set('carpeta', carpeta)
      .set('archivo', archivo.name)
      .set('tipoArchivo', mimeType);

    // 1. Obtener URL pre-firmada
    return this.https.get<{ url: string }>(
      `${this.baseUrl}/Car/subirArchivoChecklist`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      // 2. Subir el archivo a la URL pre-firmada
      switchMap(response => {
        return this.https.put(response.url, archivo, {
          headers: { 'Content-Type': mimeType }
        });
      }),
      catchError(error => {
        console.error('Error al subir el archivo:', error);
        return throwError(() => error);
      })
    );
  }

  // Listar archivos de checklist
  listarArchivosChecklist(stock: string): Observable<any> {
    // Construir ruta con formato Chk_P25-XXX
    const ruta = `Chk_${stock}`;
    
    const params = new HttpParams()
      .set('ruta', ruta);

    return this.https.get(
      `${this.baseUrl}/Car/listarArchivosChecklist`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  listarChecklistsPDI(
    fechaInicio: string,
    fechaFin: string,
    sucursal: string,
    almacen: string
  ): Observable<any> {

    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin)
      .set('sucursal', sucursal)
      .set('almacen', almacen);

    return this.https.get(
      `${this.baseUrl}/Car/listarChecklistPDI`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  obtenerChecklistPDI(idRecepcionVehiculo: number): Observable<ChecklistPDI> {

    const params = new HttpParams()
      .set('idRecepcionVehiculo', idRecepcionVehiculo.toString());

    return this.https.get(
      `${this.baseUrl}/Car/obtenerChecklistPDI`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  getSucursalesRecepcion(): Observable<SucursalRecepcion[]> {
    return this.https.get<SucursalRecepcion[]>(
      `${this.baseUrl}/Sucursal`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: SucursalRecepcion[]) => response),
      catchError(error => throwError(() => error))
    );
  }

  getAlmacenesRecepcion(idSucursal: string): Observable<AlmacenRecepcion[]> {
    return this.https.get<AlmacenRecepcion[]>(
      `${this.baseUrl}/Almacen/${idSucursal}`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: AlmacenRecepcion[]) => response),
      catchError(error => throwError(() => error))
    );
  }

  getVehiculoPorVinRecepcion(vin: string): Observable<VehiculoRecepcion> {
    return this.https.get<VehiculoRecepcion>(
      `${this.baseUrl}/Car/${vin}`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: VehiculoRecepcion) => response),
      catchError(error => throwError(() => error))
    );
  }

  guardarVehiculoRecepcion(payload: VehiculoRecepcionPayload): Observable<DocumentoRecepcion> {
    return this.https.post<DocumentoRecepcion>(
      `${this.baseUrl}/Car/ingreso`,
      payload,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map((response: DocumentoRecepcion) => response),
      catchError(error => throwError(() => error))
    );
  }

}

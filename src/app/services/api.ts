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

export interface ChecklistEquipamiento {
  código: string;
  descripcion: string;
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
  let mimeType = 'application/octet-stream'; // Default
  
  if (tipoArchivo === 'imagen') {
    // Usar el tipo MIME real del archivo
    mimeType = archivo.type || 'image/jpeg';
  } else if (tipoArchivo === 'pdf') {
    mimeType = 'application/pdf';
  }
  
  const params = new HttpParams()
    .set('carpeta', carpeta)
    .set('archivo', archivo.name)
    .set('tipoArchivo', mimeType);

  return this.https.get(
    `${this.baseUrl}/Car/subirArchivoChecklist`,
    {
      headers: this.authService.getHeaders(),
      params
    }
  ).pipe(
    map((response: any) => response),
    catchError(error => throwError(() => error))
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

}
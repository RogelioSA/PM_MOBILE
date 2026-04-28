import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {from, Observable, throwError} from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
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
  ) { }

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

  if (checklist.Color) {
    params = params.set('color', checklist.Color);
  }

  if (checklist.FechaLlegada) {
    params = params.set('fechaLlegada', new Date(checklist.FechaLlegada).toISOString());
  }

  if (checklist.FechaRecepcion) {
    params = params.set('fechaRecepcion', new Date(checklist.FechaRecepcion).toISOString());
  }

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

    const mimeType = archivo.type && archivo.type.trim() !== ''
      ? archivo.type
      : 'application/octet-stream';

    const nombreLimpio = archivo.name
      .trim()
      .replace(/\s+/g, '_');

    const params = new HttpParams()
      .set('carpeta', carpeta)
      .set('archivo', nombreLimpio)
      .set('tipoArchivo', mimeType);

    return this.https.get<{ url: string }>(
      `${this.baseUrl}/Car/subirArchivoChecklist`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      switchMap(response => {
        return from(
          fetch(response.url, {
            method: 'PUT',
            body: archivo
          })
        );
      }),
      catchError(error => {
        console.error('Error al subir el archivo:', error);
        return throwError(() => error);
      })
    );
  }

  listarArchivosChecklist(stock: string): Observable<any> {
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


  getSolicitudMantenimiento(params: {
    solicitanteUsuario: string;
    estado: string;
    prioridad: string;
    fechaDesde: string;
    fechaHasta: string;
  }): Observable<any> {

    const queryParams = new HttpParams()
      .set('solicitanteUsuario', params.solicitanteUsuario)
      .set('estado', params.estado)
      .set('prioridad', params.prioridad)
      .set('fechaDesde', params.fechaDesde)
      .set('fechaHasta', params.fechaHasta);

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/ListarSolicitudMantenimiento`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  crearSolicitudMantenimiento(params: {
    prioridad: string;
    tipo: string;
    solicitanteUsuario: string;
    sucursal: string;
    descripcion: string;
  }): Observable<any> {

    const queryParams = new HttpParams()
      .set('prioridad', params.prioridad)
      .set('tipo', params.tipo)
      .set('solicitanteUsuario', params.solicitanteUsuario)
      .set('sucursal', params.sucursal)
      .set('descripcion', params.descripcion);

    return this.https.post<any>(
      `${this.baseUrl}/SolicitudMantenimiento/CrearSolicitudMantenimiento`,
      {},
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  editarSolicitudMantenimiento(params: {
    id: number;
    estado: string;
    usuario: string;
    fechaInicio: string;
    fechaFin: string;
    fechaCierre: string;
    proveedor: string;
    tipoDocumento: string;
    serie: string;
    numero: string;
  }): Observable<any> {

    const queryParams = new HttpParams()
      .set('id', params.id.toString())
      .set('estado', params.estado)
      .set('usuario', params.usuario)
      .set('fechaInicio', params.fechaInicio)
      .set('fechaFin', params.fechaFin)
      .set('fechaCierre', params.fechaCierre)
      .set('proveedor', params.proveedor)
      .set('tipoDocumento', params.tipoDocumento)
      .set('serie', params.serie)
      .set('numero', params.numero);

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/EditarSolicitudMantenimiento`,
      {
        headers: this.authService.getHeaders(),
        params: queryParams
      }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  consultarSolicitudMantenimiento(id: number): Observable<any> {
    const queryParams = new HttpParams()
      .set('id', id.toString());

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/ConsultarSolicitudMantenimiento`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  consultarLogSolicitudMantenimiento(idSolicitudMantenimiento: number): Observable<any> {
    const queryParams = new HttpParams()
      .set('idSolicitudMantenimiento', idSolicitudMantenimiento.toString());

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/ConsultarLogSolicitudMantenimiento`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  guardarSolicitudMantenimientoPresupuesto(params: {
    id: number;
    idSolicitudMantenimiento: number;
    idClieProv: string;
    monto: number;
    fecha: string;
  }): Observable<any> {

    const queryParams = new HttpParams()
      .set('id', params.id.toString())
      .set('idSolicitudMantenimiento', params.idSolicitudMantenimiento.toString())
      .set('idClieProv', params.idClieProv)
      .set('monto', params.monto.toString())
      .set('fecha', params.fecha);

    return this.https.post<any>(
      `${this.baseUrl}/SolicitudMantenimiento/GuardarSolicitudMantenimientoPresupuesto`,
      {},
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  listarSolicitudMantenimientoPresupuesto(idSolicitudMantenimiento: number): Observable<any> {
    const queryParams = new HttpParams()
      .set('idSolicitudMantenimiento', idSolicitudMantenimiento.toString());

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/ListarSolicitudMantenimientoPresupuesto`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  subirArchivo(
    idSolicitudMantenimiento: number,
    archivo: File,
    tipoArchivo: string
  ): Observable<any> {
    const carpeta = `SM${idSolicitudMantenimiento}`;

    const mimeType = archivo.type && archivo.type.trim() !== ''
      ? archivo.type
      : 'application/octet-stream';

    const nombreLimpio = archivo.name
      .trim()
      .replace(/\s+/g, '_');

    const params = new HttpParams()
      .set('carpeta', carpeta)
      .set('archivo', nombreLimpio)
      .set('tipoArchivo', mimeType);

    return this.https.get<{ url: string }>(
      `${this.baseUrl}/SolicitudMantenimiento/subirArchivoChecklist`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      switchMap(response => {
        return from(
          fetch(response.url, {
            method: 'PUT',
            body: archivo
          })
        );
      }),
      catchError(error => {
        console.error('Error al subir el archivo:', error);
        return throwError(() => error);
      })
    );
  }

  listarArchivos(ruta: string): Observable<any> {
    const queryParams = new HttpParams()
      .set('ruta', ruta);

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/listarArchivosChecklist`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  guardarSolicitudMantenimientoDocumento(
    idSolicitudMantenimiento: number,
    idCarpeta: string
  ): Observable<any> {

    const queryParams = new HttpParams()
      .set('idSolicitudMantenimiento', idSolicitudMantenimiento.toString())
      .set('idCarpeta', idCarpeta);

    return this.https.post<any>(
      `${this.baseUrl}/SolicitudMantenimiento/GuardarSolicitudMantenimientoDocumento`,
      {},
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  eliminarSolicitudMantenimientoDocumento(id: number): Observable<any> {
    const queryParams = new HttpParams()
      .set('id', id.toString());

    return this.https.post<any>(
      `${this.baseUrl}/SolicitudMantenimiento/EliminarSolicitudMantenimientoDocumento`,
      {},
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  listarSolicitudMantenimientoDocumento(
    idSolicitudMantenimiento: number
  ): Observable<any> {

    const queryParams = new HttpParams()
      .set('idSolicitudMantenimiento', idSolicitudMantenimiento.toString());

    return this.https.get<any>(
      `${this.baseUrl}/SolicitudMantenimiento/ListarSolicitudMantenimientoDocumento`,
      { headers: this.authService.getHeaders(), params: queryParams }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  subirArchivoProveedor(
    idSolicitudMantenimiento: number,
    idProveedor: string,
    archivo: File,
    tipoArchivo: string
  ): Observable<any> {
    const carpeta = `SM/${idSolicitudMantenimiento}/${idProveedor}`;

    const mimeType = archivo.type && archivo.type.trim() !== ''
      ? archivo.type
      : 'application/octet-stream';

    const nombreLimpio = archivo.name
      .trim()
      .replace(/\s+/g, '_');

    const params = new HttpParams()
      .set('carpeta', carpeta)
      .set('archivo', nombreLimpio)
      .set('tipoArchivo', mimeType);

    return this.https.get<{ url: string }>(
      `${this.baseUrl}/SolicitudMantenimiento/subirArchivoChecklist`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      switchMap(response => {
        return from(
          fetch(response.url, {
            method: 'PUT',
            body: archivo
          })
        );
      }),
      catchError(error => {
        console.error('Error al subir el archivo del proveedor:', error);
        return throwError(() => error);
      })
    );
  }

  listarGastoSimple(
    usuarioCreacion: string,
    fechaDesde: string,
    fechaHasta: string,
    idSucursal: string,
    serie: string,
    numero: string
  ): Observable<any> {

    const params = new HttpParams()
      .set('usuarioCreacion', usuarioCreacion)
      .set('fechaDesde', fechaDesde)
      .set('fechaHasta', fechaHasta)
      .set('idSucursal', idSucursal)
      .set('serie', serie)
      .set('numero', numero);

    return this.https.get(
      `${this.baseUrl}/GastoSimple/ListarGastoSimple`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  insertarGastoSimple(
    fecha: string,
    idSucursal: string,
    monto: number,
    usuarioCreacion: string,
    idOrdenTrabajo: string,
    idProveedor: string,
    serie: string,
    numero: string,
    referenciaCarpeta: string
  ): Observable<any> {

    const params = new HttpParams()
      .set('fecha', fecha)
      .set('idSucursal', idSucursal)
      .set('monto', monto.toString())
      .set('usuarioCreacion', usuarioCreacion)
      .set('idOrdenTrabajo', idOrdenTrabajo)
      .set('idProveedor', idProveedor)
      .set('serie', serie)
      .set('numero', numero)
      .set('referenciaCarpeta', referenciaCarpeta);

    return this.https.post(
      `${this.baseUrl}/GastoSimple/InsertarGastoSimple`,
      {},
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  listarCarpeta(idCarpeta: string, modulo: string, usuario: string): Observable<any> {
    const params = new HttpParams()
      .set('idCarpeta', idCarpeta)
      .set('Modulo', modulo)
      .set('usuario', usuario);

    return this.https.get(`${this.baseUrl}/BillingPayment/listarCarpetas`, { params });
  }

  subirArchivoCarpeta(Carpeta: string, nombreArchivo: string, tipoArchivo: string, archivo: File | null): Observable<any> {
    if (!archivo) {
      return throwError(() => new Error('El archivo es nulo'));
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (archivo.size > MAX_SIZE) {
      return throwError(() => new Error('El archivo excede el tamaño máximo permitido de 25 MB.'));
    }

    const extension = archivo.name.split('.').pop();
    const archivoNombreCompleto = `${nombreArchivo}.${extension}`;

    const contentType = tipoArchivo || archivo.type || 'application/octet-stream';

    const params = new HttpParams()
      .set('Carpeta', Carpeta)
      .set('nombreArchivo', archivoNombreCompleto)
      .set('tipoArchivo', contentType);

    return this.https.get<{ url: string }>(`${this.baseUrl}/BillingPayment/subirArchivoDocumento`, { params }).pipe(
      switchMap(response => {
        const uploadUrl = response.url;
        return this.https.put(uploadUrl, archivo, {
          headers: { 'Content-Type': contentType }
        });
      }),
      catchError(error => {
        console.error('Error al subir el archivo:', error);
        return throwError(() => error);
      })
    );
  }

  crearCarpeta(body: {
    nombreCarpeta: string;
    idCarpetaPadre: number;
    carpetaRaiz: boolean;
    usuarioCreador: string;
    final: boolean;
  }): Observable<any> {
    return this.https.post(`${this.baseUrl}/BillingPayment/crearCarpeta`, body);
  }

  existeDocumento(idEmpresa: string, idCarpeta: string): Observable<any> {
    const params = new HttpParams()
      .set('idEmpresa', idEmpresa)
      .set('idCarpeta', idCarpeta);
    return this.https.post(`${this.baseUrl}/BillingPayment/existeDocumento?idEmpresa=${idEmpresa}&idCarpeta=${idCarpeta}`, null);
  }

  listarPersonal(
    nroDocumento: string,
    nombres: string,
    apellidos: string,
    pagina: number,
    tamanio: number
  ): Observable<any> {
    const params = new HttpParams()
      .set('nroDocumento', nroDocumento)
      .set('nombres', nombres)
      .set('apellidos', apellidos)
      .set('pagina', pagina.toString())
      .set('tamanio', tamanio.toString());

    return this.https.get<any>(
      `${this.baseUrl}/Personal`,
      { headers: this.authService.getHeaders(), params }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  editarPersonal(codigo: string, request: any): Observable<any> {
    return this.https.post<any>(
      `${this.baseUrl}/Personal/${codigo}`,
      request,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  guardarVariablePersonal(codigo: string, idVariable: string, valor: string): Observable<any> {
    const params = new HttpParams()
      .set('codigo_general', codigo)
      .set('idvariable', idVariable)
      .set('valor', valor);

    return this.https.post<any>(
      `${this.baseUrl}/Personal/variables`,
      {},
      { headers: this.authService.getHeaders(), params }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  listarDepartamentos(): Observable<any> {
    return this.https.get<any>(
      `${this.baseUrl}/Ubigeo/departamentos`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  listarProvincias(codigoDep: string): Observable<any> {
    const params = new HttpParams().set('codigo', codigoDep);
    return this.https.get<any>(
      `${this.baseUrl}/Ubigeo/provincias`,
      { headers: this.authService.getHeaders(), params }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  listarDistritos(codigoProv: string): Observable<any> {
    const params = new HttpParams().set('codigo', codigoProv);
    return this.https.get<any>(
      `${this.baseUrl}/Ubigeo/distritos`,
      { headers: this.authService.getHeaders(), params }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  listarUbigeosPersonal(): Observable<any> {
    return this.https.get<any>(
      `${this.baseUrl}/Personal/ubigeo`,
      { headers: this.authService.getHeaders() }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  crearDocumento(
    idEmpresa: string,
    idCarpeta: string,
    periodo: string,
    idCarpetaPadre:number,
    usuarioCreacion:string,
    metadata?: {
      idArea?: string;
      srIgv?: number;
      regimen?: string;
      moneda?: string;
      idDocumento?: string;
      vin?: string | null;
      comentario?: string;
    }
  ): Observable<any> {
    const body = {
      idEmpresa,
      idCarpeta,
      periodo,
      idCarpetaPadre,
      usuarioCreacion,
      ...(metadata ?? {})
    };

    return this.https.post(`${this.baseUrl}/BillingPayment/crearDocumento`, body);
  }

  crearOActualizarClieProv(params: {
    idCliente: string;
    tipoDocumento: string;
    nroDocumento: string;
    telefono: string;
    email: string;
    direccion: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    razonSocial: string;
  }): Observable<any> {

    const queryParams = new HttpParams()
      .set('idCliente', params.idCliente)
      .set('tipoDocumento', params.tipoDocumento)
      .set('nroDocumento', params.nroDocumento)
      .set('telefono', params.telefono)
      .set('email', params.email)
      .set('direccion', params.direccion)
      .set('nombres', params.nombres)
      .set('apellidoPaterno', params.apellidoPaterno)
      .set('apellidoMaterno', params.apellidoMaterno)
      .set('razonSocial', params.razonSocial);

    return this.https.post(
      `${this.baseUrl}/GastoSimple/ClieProv_CrearOActualizar`,
      {},
      { params: queryParams }
    );
  }

  listarBeneficiarios(codigo: string): Observable<any> {
    return this.https.get<any>(
      `${this.baseUrl}/Personal/${codigo}/beneficiario`,
      {
        headers: this.authService.getHeaders()
      }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  crearBeneficiario(codigo: string, request: any): Observable<any> {
    return this.https.post<any>(
      `${this.baseUrl}/Personal/${codigo}/crearbeneficiario`,
      request,
      {
        headers: this.authService.getHeaders()
      }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  editarBeneficiario(
    codigo: string,
    item: string,
    request: any
  ): Observable<any> {
    return this.https.post<any>(
      `${this.baseUrl}/Personal/${codigo}/editarbeneficiario/${item}`,
      request,
      {
        headers: this.authService.getHeaders()
      }
    ).pipe(
      map(response => response),
      catchError(error => throwError(() => error))
    );
  }

  obtenerPermisosUsuario(idUsuario: string, idAplicacion: string): Observable<any> {
  return this.https.get(`${this.baseUrl}/AuthReport/ObtenerModulosPorUsuario`, {
      headers: this.authService.getHeaders(),
      params: new HttpParams()
        .set('idUsuario', idUsuario)
        .set('idAplicacion', idAplicacion)
    }).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  subirArchivoPersonal(
    carpeta: string,
    archivo: File,
    tipoArchivo: string
  ): Observable<any> {

    const mimeType = archivo.type && archivo.type.trim() !== ''
      ? archivo.type
      : 'application/octet-stream';

    const carpetaLimpia = carpeta.trim();
    const nombreLimpio = archivo.name
      .trim()
      .replace(/\s+/g, '_');

    const params = new HttpParams()
      .set('carpeta', carpetaLimpia)
      .set('archivo', nombreLimpio)
      .set('tipoArchivo', mimeType);

    return this.https.get<{ url: string }>(
      `${this.baseUrl}/Personal/subirArchivo`,
      {
        headers: this.authService.getHeaders(),
        params
      }
    ).pipe(
      switchMap(response => {
        return from(
          fetch(response.url, {
            method: 'PUT',
            body: archivo
          })
        );
      }),
      catchError(error => {
        console.error('Error al subir el archivo:', error);
        return throwError(() => error);
      })
    );
  }

  listarArchivosPersonal(ruta: string): Observable<any> {

    const params = new HttpParams()
      .set('ruta', ruta);

    return this.https.get(
      `${this.baseUrl}/Personal/listarArchivos`,
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

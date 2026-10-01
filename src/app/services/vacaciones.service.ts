import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export type EstadoVacaciones = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA' | string;

export interface VacacionesSaldo {
  idPeriodo: number | string; nroDocumento: string; fechaInicioPeriodo: string; fechaFinPeriodo: string;
  periodo: string; diasAsignados: number; diasAjuste: number; diasComprometidosAprobados: number;
  saldo: number; diasReservados: number; diasDisponibles: number;
}
export interface VacacionesSolicitudDia { fecha: string; estado?: EstadoVacaciones; comentario?: string; [key: string]: unknown; }
export interface VacacionesAprobacion { [key: string]: unknown; }
export interface VacacionesMovimiento { [key: string]: unknown; }
export interface VacacionesSolicitud {
  idSolicitud: number | string; idPeriodo?: number | string; periodo?: string; fechaInicio: string; fechaFin: string;
  diasSolicitados?: number; dias?: number; estado: EstadoVacaciones; observacion?: string; fechaSolicitud?: string;
  version?: number | string;
  versionOriginal?: number | string;
  usuario?: string; nroDocumento?: string; diasDetalle?: VacacionesSolicitudDia[]; aprobaciones?: VacacionesAprobacion[];
  movimientos?: VacacionesMovimiento[]; [key: string]: unknown;
}
export interface VacacionesCalendarioDia { fecha: string; estado?: EstadoVacaciones; feriado?: boolean; nombre?: string; [key: string]: unknown; }
export interface VacacionesCalendario { dias?: VacacionesCalendarioDia[]; feriados?: VacacionesCalendarioDia[]; [key: string]: unknown; }
export interface DiaNoLaborable { fecha: string; descripcion?: string; activo?: boolean; [key: string]: unknown; }
export interface SolicitudVacacionesRequest {
  nroDocumento: string; idPeriodo: number | string; fechaInicio: string; fechaFin: string; usuario: string;
  observacion: string;
  idSolicitud?: number | string; versionOriginal?: number | string;
}

@Injectable({ providedIn: 'root' })
export class VacacionesService {
  private readonly baseUrl = `${environment.apiUrl}/RecursosHumanos/Vacaciones`;
  constructor(private http: HttpClient, private auth: Auth) {}
  private options() { return { headers: this.auth.getHeaders() }; }
  private unwrap<T>(response: any): T { return (response?.data ?? response) as T; }
  private unwrapList<T>(response: any): T[] { const data = response?.data ?? response; if (Array.isArray(data)) return data as T[]; if (Array.isArray(data?.items)) return data.items as T[]; if (Array.isArray(data?.solicitudes)) return data.solicitudes as T[]; return []; }
  private fail(error: unknown) { return throwError(() => error); }

  obtenerSaldos(nroDocumento: string): Observable<VacacionesSaldo[]> {
    return this.http.get<any>(`${this.baseUrl}/Saldo`, { ...this.options(), params: new HttpParams().set('nroDocumento', nroDocumento) }).pipe(map(r => this.unwrap<VacacionesSaldo[]>(r) ?? []), catchError(e => this.fail(e)));
  }
  listarSolicitudes(filtros: { nroDocumento: string; estado?: string; fechaDesde?: string; fechaHasta?: string }): Observable<VacacionesSolicitud[]> {
    let params = new HttpParams().set('nroDocumento', filtros.nroDocumento);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return this.http.get<any>(`${this.baseUrl}/Solicitudes`, { ...this.options(), params }).pipe(map(r => this.unwrap<VacacionesSolicitud[]>(r) ?? []), catchError(e => this.fail(e)));
  }
  obtenerSolicitud(id: number | string): Observable<VacacionesSolicitud> { return this.http.get<any>(`${this.baseUrl}/Solicitudes/${id}`, this.options()).pipe(map(r => this.unwrap<VacacionesSolicitud>(r)), catchError(e => this.fail(e))); }
  guardarSolicitud(request: SolicitudVacacionesRequest): Observable<any> { return this.http.post(`${this.baseUrl}/Solicitudes`, request, this.options()).pipe(catchError(e => this.fail(e))); }
  enviarSolicitud(id: number | string, request: Record<string, unknown>): Observable<any> { return this.http.post(`${this.baseUrl}/Solicitudes/${id}/Enviar`, request, this.options()).pipe(catchError(e => this.fail(e))); }
  cancelarSolicitud(id: number | string, request: Record<string, unknown>): Observable<any> { return this.http.post(`${this.baseUrl}/Solicitudes/${id}/Cancelar`, request, this.options()).pipe(catchError(e => this.fail(e))); }
  aprobarSolicitud(id: number | string, request: { usuarioAprobador: string; fechaActual: string; comentario: string }): Observable<any> { return this.http.post(`${this.baseUrl}/Solicitudes/${id}/Aprobar`, request, this.options()).pipe(catchError(e => this.fail(e))); }
  obtenerCalendario(nroDocumento: string, fechaDesde: string, fechaHasta: string): Observable<VacacionesCalendario> { const params = new HttpParams().set('nroDocumento', nroDocumento).set('fechaDesde', fechaDesde).set('fechaHasta', fechaHasta); return this.http.get<any>(`${this.baseUrl}/Calendario`, { ...this.options(), params }).pipe(map(r => this.unwrap<VacacionesCalendario>(r)), catchError(e => this.fail(e))); }
  listarGozadas(nroDocumento: string, fechaCorte: string): Observable<any[]> { return this.http.get<any>(`${this.baseUrl}/Gozadas`, { ...this.options(), params: new HttpParams().set('nroDocumento', nroDocumento).set('fechaCorte', fechaCorte) }).pipe(map(r => this.unwrap<any[]>(r) ?? []), catchError(e => this.fail(e))); }
  listarAprobaciones(usuarioAprobador: string, estado: string): Observable<any[]> { return this.http.get<any>(`${this.baseUrl}/Aprobaciones`, { ...this.options(), params: new HttpParams().set('usuarioAprobador', usuarioAprobador).set('estado', estado) }).pipe(map(r => this.unwrapList<any>(r)), catchError(e => this.fail(e))); }
  listarMovimientos(idPeriodo: number | string): Observable<VacacionesMovimiento[]> { return this.http.get<any>(`${this.baseUrl}/Periodos/${idPeriodo}/Movimientos`, this.options()).pipe(map(r => this.unwrap<VacacionesMovimiento[]>(r) ?? []), catchError(e => this.fail(e))); }
  listarDiasNoLaborables(fechaDesde: string, fechaHasta: string): Observable<DiaNoLaborable[]> { const params = new HttpParams().set('fechaDesde', fechaDesde).set('fechaHasta', fechaHasta).set('soloActivos', 'true'); return this.http.get<any>(`${this.baseUrl}/DiasNoLaborables`, { ...this.options(), params }).pipe(map(r => this.unwrap<DiaNoLaborable[]>(r) ?? []), catchError(e => this.fail(e))); }
}

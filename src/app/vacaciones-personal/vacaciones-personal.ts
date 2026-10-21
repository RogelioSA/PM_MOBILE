import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Menu } from '../menu/menu';
import { Auth } from '../services/auth';
import { VacacionesService, VacacionesSolicitud } from '../services/vacaciones.service';

@Component({ selector: 'app-vacaciones-personal', standalone: true, imports: [CommonModule, FormsModule, RouterModule, Menu, ButtonModule, DatePickerModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule, ToastModule, TooltipModule], providers: [MessageService], templateUrl: './vacaciones-personal.html', styleUrl: './vacaciones-personal.css' })
export class VacacionesPersonal implements OnInit {
  usuarioAprobador = ''; estado = 'PENDIENTE'; solicitudes: VacacionesSolicitud[] = []; filtradas: VacacionesSolicitud[] = [];
  fechaDesde: Date | null = null; fechaHasta: Date | null = null; cargando = false; detalleVisible = false; solicitudSeleccionada: VacacionesSolicitud | null = null;
  aprobacionVisible = false; solicitudAprobacion: VacacionesSolicitud | null = null; comentarioAprobacion = ''; aprobando = false;
  readonly estados = [{ label: 'Pendientes', value: 'PENDIENTE' }, { label: 'Todas', value: '' }, { label: 'Aprobadas', value: 'APROBADA' }, { label: 'Rechazadas', value: 'RECHAZADA' }];
  constructor(private vacaciones: VacacionesService, private auth: Auth, private messages: MessageService) {}
  ngOnInit(): void { this.usuarioAprobador = this.auth.getUsuario() || this.cookie('usuario'); this.cargar(); }
  cargar(): void { this.cargando = true; this.vacaciones.listarAprobaciones(this.usuarioAprobador, this.estado).subscribe({ next: data => { this.solicitudes = (data || []).map(item => this.normalizarSolicitud(item)); this.aplicarFiltros(); this.cargando = false; }, error: e => { this.solicitudes = []; this.filtradas = []; this.cargando = false; this.messages.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudieron cargar las solicitudes.' }); } }); }
  aplicarFiltros(): void { this.filtradas = this.solicitudes.filter(item => { const fecha = this.fecha(item.fechaSolicitud || item.fechaInicio); const desde = this.fechaDesde ? this.inicioDia(this.fechaDesde).getTime() : -Infinity; const hasta = this.fechaHasta ? this.finDia(this.fechaHasta).getTime() : Infinity; return fecha >= desde && fecha <= hasta; }); }
  verDetalle(item: VacacionesSolicitud): void { this.solicitudSeleccionada = item; this.detalleVisible = true; this.vacaciones.obtenerSolicitud(item.idSolicitud).subscribe({ next: value => { const detalle: any = value || {}; this.solicitudSeleccionada = { ...item, ...(detalle.solicitud || detalle), diasDetalle: detalle.dias || detalle.diasDetalle || item.diasDetalle, aprobaciones: detalle.aprobaciones || item.aprobaciones, movimientos: detalle.movimientos || item.movimientos }; }, error: () => undefined }); }
  aprobar(item: VacacionesSolicitud): void { this.solicitudAprobacion = item; this.comentarioAprobacion = ''; this.aprobacionVisible = true; }
  confirmarAprobacion(): void {
    if (!this.solicitudAprobacion || this.aprobando) return;
    this.aprobando = true;
    const hoy = new Date();
    const fechaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    this.vacaciones.aprobarSolicitud(this.solicitudAprobacion.idSolicitud, { usuarioAprobador: this.usuarioAprobador, fechaActual, comentario: this.comentarioAprobacion.trim() }).subscribe({
      next: () => { this.aprobando = false; this.aprobacionVisible = false; this.messages.add({ severity: 'success', summary: 'Solicitud aprobada', detail: 'La solicitud fue aprobada correctamente.' }); this.cargar(); },
      error: e => { this.aprobando = false; this.messages.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo aprobar la solicitud.' }); }
    });
  }
  severidad(estado?: string): 'secondary' | 'warn' | 'success' | 'danger' | 'contrast' { switch ((estado || '').toUpperCase()) { case 'PENDIENTE': return 'warn'; case 'APROBADA': return 'success'; case 'RECHAZADA': return 'danger'; case 'CANCELADA': return 'contrast'; default: return 'secondary'; } }
  dias(item: VacacionesSolicitud): number { return item.diasSolicitados ?? item.dias ?? 0; }
  nombrePersonal(item: VacacionesSolicitud): string { const valor: any = item['Personal'] ?? item['personal'] ?? item['nombrePersonal'] ?? item['nombresApellidos']; if (typeof valor === 'string') return valor; if (valor && typeof valor === 'object') return [valor.nombres, valor.apellido_Paterno ?? valor.apellidoPaterno, valor.apellido_Materno ?? valor.apellidoMaterno].filter(Boolean).join(' ') || valor.nombre || valor.descripcion || '-'; return '-'; }
  private normalizarSolicitud(raw: any): VacacionesSolicitud { const get = (...keys: string[]) => keys.map(key => raw?.[key]).find(value => value !== undefined && value !== null); return { ...raw, idSolicitud: get('idSolicitud', 'IdSolicitud', 'IDSolicitud', 'id') ?? '', idPeriodo: get('idPeriodo', 'IdPeriodo', 'IDPeriodo'), periodo: get('periodo', 'Periodo', 'descripcionPeriodo'), fechaInicio: get('fechaInicio', 'FechaInicio', 'fechaInicioSolicitud') ?? '', fechaFin: get('fechaFin', 'FechaFin', 'fechaFinSolicitud') ?? '', diasSolicitados: get('diasSolicitados', 'DiasSolicitados', 'dias', 'Dias'), estado: String(get('estado', 'Estado') ?? '').toUpperCase(), observacion: get('observacion', 'Observacion', 'Observación'), fechaSolicitud: get('fechaSolicitud', 'FechaSolicitud'), nroDocumento: get('nroDocumento', 'NroDocumento', 'dni', 'DNI'), Personal: get('Personal', 'personal', 'NombresApellidos', 'nombresApellidos', 'nombrePersonal') } as VacacionesSolicitud; }
  private formatearFecha(value?: string): string { if (!value) return '-'; const fecha = new Date(value); return Number.isNaN(fecha.getTime()) ? value : fecha.toLocaleDateString('es-PE'); }
  private fecha(value?: string): number { const parsed = value ? new Date(value).getTime() : 0; return Number.isNaN(parsed) ? 0 : parsed; }
  private inicioDia(value: Date): Date { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
  private finDia(value: Date): Date { return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999); }
  private cookie(name: string): string { const found = document.cookie.split('; ').find(c => c.startsWith(`${name}=`)); return found ? decodeURIComponent(found.split('=').slice(1).join('=')) : ''; }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Api, MotivoJustificacion } from '../services/api';
import { Auth } from '../services/auth';

interface MarcacionPersonal {
  sucursal: string;
  fecha: string;
  ingreso: string | null;
  detalle: string;
  observacion: string;
  minutosTarde: string | null;
  revisionMarcaciones: string;
  IDOTROSDOCUMENTOS?: string | null;
  IDMOTIVOMOVIMIENTO?: string | null;
  IDESTADO?: string | null;
  FECHADESDEJUSTIFICACION?: string | null;
  FECHAHASTAJUSTIFICACION?: string | null;
  DESCRIPCIONJUSTIFICACION?: string | null;
}

interface JustificacionMarcacion {
  sucursal: string;
  fecha: string;
  justificacion: string;
  estado: string;
  registro: MarcacionPersonal;
}

@Component({
  selector: 'app-mis-justificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './misJustificaciones.html',
  styleUrl: './misJustificaciones.css'
})
export class MisJustificaciones implements OnInit {
  fechaBase = new Date();
  cargando = false;
  cargandoMotivos = false;
  mensajeError = '';
  mensajeExito = '';
  mostrarFormulario = false;
  registroSeleccionado: JustificacionMarcacion | null = null;
  justificaciones: JustificacionMarcacion[] = [];
  motivos: MotivoJustificacion[] = [];
  formulario = {
    motivo: '',
    fechaDesde: '',
    fechaHasta: '',
    observaciones: '',
    sustentos: null as FileList | null
  };

  constructor(
    private apiService: Api,
    private authService: Auth
  ) {}

  ngOnInit(): void {
    this.cargarMotivosJustificacion();
    this.cargarMarcacionesPendientes();
  }

  get rangoSemanaActual(): { desde: Date; hasta: Date } {
    const fecha = new Date(this.fechaBase);
    const dia = fecha.getDay();
    const distanciaLunes = dia === 0 ? -6 : 1 - dia;
    const desde = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + distanciaLunes);
    const hasta = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 6);
    return { desde, hasta };
  }

  get semanaActual(): string {
    const { desde, hasta } = this.rangoSemanaActual;
    return `${this.formatearFechaIso(desde).replaceAll('-', '/')} al ${this.formatearFechaIso(hasta).replaceAll('-', '/')}`;
  }

  cambiarSemana(valor: number): void {
    this.fechaBase = new Date(
      this.fechaBase.getFullYear(),
      this.fechaBase.getMonth(),
      this.fechaBase.getDate() + (valor * 7)
    );
    this.cargarMarcacionesPendientes();
  }

  cargarMotivosJustificacion(): void {
    this.cargandoMotivos = true;

    this.apiService.listarMotivosJustificacion().subscribe({
      next: (response) => {
        const datos = Array.isArray(response)
          ? response
          : Array.isArray((response as { data?: MotivoJustificacion[] })?.data)
            ? (response as { data: MotivoJustificacion[] }).data
            : [];
        this.motivos = datos;
        this.cargandoMotivos = false;
      },
      error: (error) => {
        this.motivos = [];
        this.mensajeError = error?.error?.message ?? 'No se pudieron cargar los motivos de justificación.';
        this.cargandoMotivos = false;
      }
    });
  }

  cargarMarcacionesPendientes(): void {
    const nroDocumento = this.authService.getUsuario();

    if (!nroDocumento) {
      this.mensajeError = 'No se encontró el documento del usuario autenticado.';
      return;
    }

    const { desde, hasta } = this.rangoSemanaActual;
    this.cargando = true;
    this.mensajeError = '';

    this.apiService.listarReporteMarcacionesGeneral(
      this.formatearFechaIso(desde),
      this.formatearFechaIso(hasta),
      3,
      nroDocumento
    ).subscribe({
      next: (response) => {
        this.justificaciones = Array.isArray(response?.data)
          ? response.data
              .filter((registro: MarcacionPersonal) => this.tieneIngreso_Tardanzas(registro.ingreso, registro.minutosTarde))
              .sort((a: MarcacionPersonal, b: MarcacionPersonal) => this.obtenerTiempoFecha(b.fecha) - this.obtenerTiempoFecha(a.fecha))
              .map((registro: MarcacionPersonal) => ({
                sucursal: registro.sucursal,
                fecha: registro.fecha,
                justificacion: registro.DESCRIPCIONJUSTIFICACION || registro.detalle || registro.observacion || 'Pendiente de justificar',
                estado: registro.IDESTADO || registro.revisionMarcaciones || 'Pendiente',
                registro
              }))
          : [];
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = error?.error?.message ?? 'No se pudieron cargar las marcaciones pendientes.';
        this.justificaciones = [];
        this.cargando = false;
      }
    });
  }

  abrirRegistro(item: JustificacionMarcacion): void {
    const fechaRegistro = this.formatearFechaIsoDesdeRegistro(item.fecha);
    const registro = item.registro;
    this.registroSeleccionado = item;
    this.mostrarFormulario = true;
    this.mensajeExito = '';
    this.formulario = {
      motivo: registro.IDMOTIVOMOVIMIENTO ?? '',
      fechaDesde: this.formatearFechaIsoDesdeValor(registro.FECHADESDEJUSTIFICACION) || fechaRegistro,
      fechaHasta: this.formatearFechaIsoDesdeValor(registro.FECHAHASTAJUSTIFICACION) || fechaRegistro,
      observaciones: registro.DESCRIPCIONJUSTIFICACION ?? '',
      sustentos: null
    };
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.registroSeleccionado = null;
  }

  seleccionarSustentos(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.formulario.sustentos = input.files;
  }

  guardarJustificacion(): void {
    if (!this.registroSeleccionado || !this.formulario.motivo || !this.formulario.fechaHasta) return;

    this.mensajeExito = `Justificación registrada para ${this.formatearFechaRegistro(this.registroSeleccionado.fecha)}.`;
    this.cerrarFormulario();
  }

  tieneIngreso_Tardanzas(
    ingreso: string | null | undefined,
    minutosTarde: string | null | undefined
  ): boolean {
    const sinIngreso = !ingreso?.trim();
    const tieneTardanza = !!minutosTarde?.trim() && minutosTarde.trim() !== '00:00:00';
    return sinIngreso || tieneTardanza;
  }

  formatearFechaRegistro(fecha: string): string {
    const [fechaParte] = fecha.split(' ');
    const [mes, dia, anio] = fechaParte.split('/');
    return `${dia}/${mes}/${anio}`;
  }

  private formatearFechaIsoDesdeRegistro(fecha: string): string {
    const [fechaParte] = fecha.split(' ');
    const [mes, dia, anio] = fechaParte.split('/');
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  private formatearFechaIsoDesdeValor(fecha: string | null | undefined): string {
    if (!fecha) return '';

    const coincidenciaIso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (coincidenciaIso) return `${coincidenciaIso[1]}-${coincidenciaIso[2]}-${coincidenciaIso[3]}`;

    return this.formatearFechaIsoDesdeRegistro(fecha);
  }

  private obtenerTiempoFecha(fecha: string): number {
    const [fechaParte, horaParte = '00:00:00'] = fecha.split(' ');
    const [mes = '1', dia = '1', anio = '1970'] = fechaParte.split('/');
    const [horas = 0, minutos = 0, segundos = 0] = horaParte.split(':').map(Number);
    return new Date(Number(anio), Number(mes) - 1, Number(dia), horas, minutos, segundos).getTime();
  }

  private formatearFechaIso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dia = `${fecha.getDate()}`.padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}

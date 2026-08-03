import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Api } from '../services/api';
import { Auth } from '../services/auth';

interface MarcacionPersonal {
  sucursal: string;
  fecha: string;
  ingreso: string | null;
  detalle: string;
  observacion: string;
  revisionMarcaciones: string;
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
  cargando = false;
  mensajeError = '';
  mensajeExito = '';
  mostrarFormulario = false;
  registroSeleccionado: JustificacionMarcacion | null = null;
  justificaciones: JustificacionMarcacion[] = [];
  motivos = ['PERMISO PERSONAL', 'DESCANSO MEDICO', 'CAPACITACIONES', 'PERMISO DE SALUD'];
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
    this.cargarMarcacionesPendientes();
  }

  cargarMarcacionesPendientes(): void {
    const nroDocumento = this.authService.getUsuario();

    if (!nroDocumento) {
      this.mensajeError = 'No se encontró el documento del usuario autenticado.';
      return;
    }

    const desde = this.obtenerFechaRelativa(-1);
    const hasta = this.obtenerFechaRelativa(0);
    this.cargando = true;
    this.mensajeError = '';

    this.apiService.listarReporteMarcacionesGeneral(desde, hasta, 3, nroDocumento).subscribe({
      next: (response) => {
        this.justificaciones = Array.isArray(response?.data)
          ? response.data
              .filter((registro: MarcacionPersonal) => !this.tieneIngreso(registro.ingreso))
              .sort((a: MarcacionPersonal, b: MarcacionPersonal) => this.obtenerTiempoFecha(b.fecha) - this.obtenerTiempoFecha(a.fecha))
              .map((registro: MarcacionPersonal) => ({
                sucursal: registro.sucursal,
                fecha: registro.fecha,
                justificacion: registro.detalle || registro.observacion || 'Pendiente de justificar',
                estado: registro.revisionMarcaciones || 'Pendiente',
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
    const fecha = this.formatearFechaIsoDesdeRegistro(item.fecha);
    this.registroSeleccionado = item;
    this.mostrarFormulario = true;
    this.mensajeExito = '';
    this.formulario = {
      motivo: '',
      fechaDesde: fecha,
      fechaHasta: fecha,
      observaciones: '',
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

  tieneIngreso(ingreso: string | null | undefined): boolean {
    return !!ingreso?.trim();
  }

  formatearFechaRegistro(fecha: string): string {
    const [fechaParte] = fecha.split(' ');
    const [mes, dia, anio] = fechaParte.split('/');
    return `${dia}/${mes}/${anio}`;
  }

  private obtenerFechaRelativa(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return this.formatearFechaIso(fecha);
  }

  private formatearFechaIsoDesdeRegistro(fecha: string): string {
    const [fechaParte] = fecha.split(' ');
    const [mes, dia, anio] = fechaParte.split('/');
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
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

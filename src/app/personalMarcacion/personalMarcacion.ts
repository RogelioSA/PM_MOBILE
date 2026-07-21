import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Api } from '../services/api';
import { Auth } from '../services/auth';

interface MarcacionPersonal {
  orden: number;
  sucursal: string;
  idcodigogeneral: string;
  empleado: string;
  fecha: string;
  diasemana: number;
  iProg: string;
  ingreso: string;
  minutosTarde: string;
  sProg: string;
  salida: string;
  diferencia: number;
  detalle: string;
  horario: string;
  nombreDia: string;
  observacion: string;
  check_out: string;
  inicioBreak: string | null;
  finBreak: string | null;
  revisionMarcaciones: string;
}

@Component({
  selector: 'app-personal-marcacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './personalMarcacion.html',
  styleUrl: './personalMarcacion.css'
})
export class PersonalMarcacion implements OnInit {
  fechaBase = new Date();
  cargando = false;
  mensajeError = '';
  mostrarModalDetalle = false;
  registroSeleccionado: MarcacionPersonal | null = null;
  registrosAsistencia: MarcacionPersonal[] = [];

  constructor(
    private apiService: Api,
    private authService: Auth
  ) {}

  ngOnInit(): void {
    this.cargarMarcaciones();
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

  get totalRegistros(): number { return this.registrosAsistencia.length; }
  get totalTardanzas(): number { return this.registrosAsistencia.filter((r) => this.esTardanza(r.minutosTarde)).length; }
  get minutosAcumulados(): number {
    return this.registrosAsistencia.reduce((total, r) => total + this.obtenerMinutosTardanza(r.minutosTarde), 0);
  }

  cambiarSemana(valor: number): void {
    this.fechaBase = new Date(this.fechaBase.getFullYear(), this.fechaBase.getMonth(), this.fechaBase.getDate() + (valor * 7));
    this.cargarMarcaciones();
  }

  cargarMarcaciones(): void {
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
        this.registrosAsistencia = Array.isArray(response?.data) ? response.data : [];
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = error?.error?.message ?? 'No se pudieron cargar las marcaciones.';
        this.registrosAsistencia = [];
        this.cargando = false;
      }
    });
  }

  abrirDetalle(registro: MarcacionPersonal): void {
    this.registroSeleccionado = registro;
    this.mostrarModalDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarModalDetalle = false;
    this.registroSeleccionado = null;
  }

  esTardanza(minutosTarde: string | null | undefined): boolean {
    return !!minutosTarde && minutosTarde !== '00:00:00';
  }

  obtenerMinutosTardanza(minutosTarde: string | null | undefined): number {
    if (!this.esTardanza(minutosTarde)) return 0;
    const [horas = '0', minutos = '0', segundos = '0'] = (minutosTarde ?? '').split(':');
    return (Number(horas) * 60) + Number(minutos) + (Number(segundos) > 0 ? 1 : 0);
  }

  formatearFechaRegistro(fecha: string): string {
    const [fechaParte] = fecha.split(' ');
    const [mes, dia, anio] = fechaParte.split('/');
    return `${dia}/${mes}/${anio}`;
  }

  private formatearFechaIso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dia = `${fecha.getDate()}`.padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Observable, switchMap } from 'rxjs';
import { Api, MotivoJustificacion, OtrosDocumentosPayload } from '../services/api';
import { Auth } from '../services/auth';

interface MarcacionPersonal {
  sucursal: string;
  fecha: string;
  ingreso: string | null;
  detalle: string;
  observacion: string;
  minutosTarde: string | null;
  revisionMarcaciones: string;
  idotrosdocumentos?: string | null;
  idmotivosmovimiento?: string | null;
  idestado?: string | null;
  fechadesdejustificacion?: string | null;
  fechahastajustificacion?: string | null;
  descripcionjustificacion?: string | null;
}

interface JustificacionMarcacion {
  sucursal: string;
  fecha: string;
  justificacion: string;
  estado: string;
  registro: MarcacionPersonal;
}

interface ArchivoSustento {
  nombre: string;
  url: string;
  esImagen: boolean;
}

@Component({
  selector: 'app-mis-justificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './misJustificaciones.html',
  styleUrl: './misJustificaciones.css'
})
export class MisJustificaciones implements OnInit {
  private readonly estadosJustificacion: Record<string, string> = {
    RE: 'REGULARIZAR',
    PE: 'PENDIENTE APROBACIÓN',
    AP: 'APROBADO'
  };

  fechaBase = new Date();
  cargando = false;
  cargandoMotivos = false;
  subiendoSustentos = false;
  cargandoSustentos = false;
  mensajeErrorSustentos = '';
  mensajeError = '';
  mensajeExito = '';
  mostrarFormulario = false;
  registroSeleccionado: JustificacionMarcacion | null = null;
  justificaciones: JustificacionMarcacion[] = [];
  motivos: MotivoJustificacion[] = [];
  archivosSustento: ArchivoSustento[] = [];
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
                justificacion: registro.descripcionjustificacion || registro.detalle || registro.observacion || 'Pendiente de justificar',
                estado: this.obtenerDescripcionEstado(
                  registro.idestado || registro.revisionMarcaciones
                ),
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
      motivo: registro.idmotivosmovimiento ?? '',
      fechaDesde: this.formatearFechaIsoDesdeValor(registro.fechadesdejustificacion) || fechaRegistro,
      fechaHasta: this.formatearFechaIsoDesdeValor(registro.fechahastajustificacion) || fechaRegistro,
      observaciones: registro.descripcionjustificacion ?? '',
      sustentos: null
    };
    this.cargarSustentosDigitales(this.formulario.fechaDesde);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.registroSeleccionado = null;
    this.archivosSustento = [];
    this.cargandoSustentos = false;
    this.mensajeErrorSustentos = '';
  }

  cargarSustentosDigitales(fechaDesde: string): void {
    const nroDocumento = this.authService.getUsuario();
    this.archivosSustento = [];
    this.mensajeErrorSustentos = '';

    if (!nroDocumento) {
      this.mensajeErrorSustentos = 'No se encontró el documento del usuario para consultar los sustentos.';
      return;
    }

    const carpetaFecha = fechaDesde.replaceAll('-', '');
    const carpeta = `${nroDocumento}/${carpetaFecha}`;
    this.cargandoSustentos = true;

    this.apiService.listarArchivosPersonal(carpeta).subscribe({
      next: (response) => {
        const archivos = this.obtenerListaArchivos(response);
        this.archivosSustento = archivos.map((archivo: any) => {
          const nombre = archivo.nombre ?? archivo.name ?? '';
          return {
            nombre,
            url: archivo.url ?? archivo.ruta ?? '',
            esImagen: this.esImagen(nombre)
          };
        });
        this.cargandoSustentos = false;
      },
      error: (error) => {
        this.archivosSustento = [];
        this.cargandoSustentos = false;
        this.mensajeErrorSustentos = error?.error?.message
          ?? 'No se pudieron consultar los sustentos digitales.';
      }
    });
  }

  seleccionarSustentos(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.formulario.sustentos = input.files;
  }

  guardarJustificacion(): void {
    if (
      !this.registroSeleccionado ||
      !this.formulario.motivo ||
      !this.formulario.fechaDesde ||
      !this.formulario.fechaHasta ||
      this.subiendoSustentos
    ) return;

    const nroDocumento = this.authService.getUsuario();
    if (!nroDocumento) {
      this.mensajeError = 'No se encontró el documento del usuario autenticado.';
      return;
    }

    if (this.formulario.fechaHasta < this.formulario.fechaDesde) {
      this.mensajeError = 'La fecha hasta no puede ser anterior a la fecha desde.';
      return;
    }

    const fechaRegistro = this.registroSeleccionado.fecha;
    const registro = this.registroSeleccionado.registro;
    const payload: OtrosDocumentosPayload = {
      idEmpresa: '001',
      idOtrosDocumentos: registro.idotrosdocumentos?.trim() ?? '',
      tipo: 'OM',
      codigoPersonal: nroDocumento,
      idMotivo: this.formulario.motivo,
      fechaDesde: this.formatearFechaParaApi(this.formulario.fechaDesde),
      fechaHasta: this.formatearFechaParaApi(this.formulario.fechaHasta),
      descripcion: this.formulario.observaciones.trim(),
      nroCertificado: '',
      centroMedico: '',
      idSucursal: this.registroSeleccionado.sucursal,
      idEmisor: '',
      idPlanilla: ''
    };
    const sustentos = Array.from(this.formulario.sustentos ?? []);
    const carpetaFecha = this.formulario.fechaDesde.replaceAll('-', '');
    const carpeta = `${nroDocumento}/${carpetaFecha}`;
    this.subiendoSustentos = true;
    this.mensajeError = '';

    const guardar$: Observable<any> = sustentos.length
      ? forkJoin(
          sustentos.map((archivo) =>
            this.apiService.subirArchivoPersonal(
              carpeta,
              archivo,
              archivo.type || 'application/octet-stream'
            )
          )
        ).pipe(switchMap(() => this.apiService.guardarOtrosDocumentos(payload)))
      : this.apiService.guardarOtrosDocumentos(payload);

    guardar$.subscribe({
      next: () => {
        this.subiendoSustentos = false;
        this.finalizarRegistroJustificacion(fechaRegistro);
      },
      error: (error) => {
        this.subiendoSustentos = false;
        this.mensajeError = error?.error?.message ?? 'No se pudo guardar la justificación.';
      }
    });
  }

  private finalizarRegistroJustificacion(fechaRegistro: string): void {
    this.mensajeExito = `Justificación registrada para ${this.formatearFechaRegistro(fechaRegistro)}.`;
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

  private obtenerDescripcionEstado(estado: string | null | undefined): string {
    if (!estado?.trim()) return 'Pendiente';

    const codigo = estado.trim().toUpperCase();
    return this.estadosJustificacion[codigo] ?? estado;
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

  private formatearFechaParaApi(fecha: string): string {
    return `${fecha}T00:00:00.000Z`;
  }

  private obtenerListaArchivos(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.success && Array.isArray(response.data)) return response.data;
    return [];
  }

  private esImagen(nombre: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(nombre);
  }
}

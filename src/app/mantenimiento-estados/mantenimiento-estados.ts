// mantenimiento-estados.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { Menu } from '../menu/menu';
import { Api } from '../services/api';
import { Master } from '../services/master';
import { CookieService } from 'ngx-cookie-service';

interface SolicitudMantenimiento {
  id: number;
  prioridad: string;
  prioridadNombre: string;
  tipo: string;
  tipoNombre: string;
  descripcion: string;
  solicitante: string;
  sitio: string;
  sitioNombre: string;
  estado: number;
  estadoNombre: string;
  estadoCodigo: string;
  fechaCreacion: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaCierre?: string;
  proveedor?: string;
  nombreProveedor?: string;
  totalDocumentos?: number;
  fotos: FotoMantenimiento[];
  cargandoFotos?: boolean;
}

interface FotoMantenimiento {
  id: string;
  url: string;
  nombre: string;
  size?: number;
  lastModified?: string;
}

interface PresupuestoProveedor {
  idclieprov: string;
  razon_social: string;
  monto: number;
  editando?: boolean;
}

interface PresupuestoListado {
  id: number;
  idSolicitudMantenimiento: number;
  idClieProv: string;
  proveedor: string;
  monto: number;
  fecha: string;
  seleccionado?: boolean;
}

interface DocumentoSeleccionado {
  idcarpeta: string;
  tipoDocumento: string;
  serie: string;
  numero: string;
  importebruto: number;
  importeneto: number;
  fechaemision: string;
  editando?: boolean;
}

@Component({
  selector: 'app-mantenimiento-estados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DialogModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    CheckboxModule,
    DatePickerModule,
    Menu
  ],
  templateUrl: './mantenimiento-estados.html',
  styleUrls: ['./mantenimiento-estados.css'],
  providers: [MessageService]
})
export class MantenimientoEstados implements OnInit {
  solicitudes: SolicitudMantenimiento[] = [];
  cargando = false;

  // Filtros
  estadoFiltro = '';
  prioridadFiltro = '';
  fechaDesde = '';
  fechaHasta = '';
  solicitanteFiltro = '';

  // Usuario actual
  usuarioActual = '';

  proveedorInfo: any = null;
  filtroDocumento = '';
  documentosFiltrados: any[] = [];
  cargandoDocumentos = false;
  busquedaDocumentoTimeout: any = null;
  documentoTemporal: any = null;
  documentosSeleccionados: DocumentoSeleccionado[] = [];

  // Opciones
  prioridades: any[] = [
    { label: 'Todas', value: '' },
    { label: 'Baja', value: '1' },
    { label: 'Media', value: '2' },
    { label: 'Alta', value: '3' },
    { label: 'Urgente', value: '4' }
  ];

  tipos: any[] = [
    { label: 'Correctivo', value: '1' },
    { label: 'Preventivo', value: '2' },
    { label: 'Predictivo', value: '3' },
    { label: 'Instalación', value: '4' }
  ];

  estados: any[] = [
    { label: 'Todos', value: '' },
    { label: 'Pendiente', value: 'PEN' },
    { label: 'Espera de Presupuesto', value: 'ESP' },
    { label: 'Control', value: 'CON' },
    { label: 'Asignado', value: 'ASI' },
    { label: 'En Ejecución', value: 'EJE' }
  ];

  tiposDocumento: any[] = [
    { label: 'Seleccione tipo', value: '' },
    { label: 'Factura', value: 'Factura' },
    { label: 'Boleta', value: 'Boleta' },
    { label: 'Recibo de Honorarios', value: 'Recibo de Honorarios' },
    { label: 'Recibo', value: 'Recibo' }
  ];

  sucursales: any[] = [];

  // Proveedores - Búsqueda en vivo
  filtroProveedor = '';
  proveedoresFiltrados: any[] = [];
  cargandoProveedores = false;
  busquedaTimeout: any = null;
  proveedorSeleccionado: any = null;

  // Modal detalle con logs
  mostrarDetalle = false;
  solicitudSeleccionada: SolicitudMantenimiento | null = null;
  logs: any[] = [];
  cargandoLogs = false;

  // Modal seleccionar proveedores y presupuestos
  mostrarProveedores = false;
  solicitudProveedores: SolicitudMantenimiento | null = null;
  presupuestos: PresupuestoProveedor[] = [];

  // Modal asignación de proveedor
  mostrarAsignacion = false;
  solicitudAsignacion: SolicitudMantenimiento | null = null;
  presupuestosListado: PresupuestoListado[] = [];
  proveedorAsignado = '';

  // Modal ejecución
  mostrarEjecucion = false;
  solicitudEjecucion: SolicitudMantenimiento | null = null;
  fechaInicio: Date | null = null;

  // Modal contabilidad
  mostrarContabilidad = false;
  solicitudContabilidad: SolicitudMantenimiento | null = null;
  fechaFin: Date | null = null;

  // Modal finalización
  mostrarFinalizacion = false;
  solicitudFinalizacion: SolicitudMantenimiento | null = null;

  // Modal ver finalizado (FIN)
  mostrarVerFinalizado = false;
  solicitudVerFinalizado: SolicitudMantenimiento | null = null;
  documentosFinalizados: any[] = [];
  cargandoDocumentosFinalizados = false;

  // Modal imagen
  mostrarImagenModal = false;
  imagenSeleccionada: FotoMantenimiento | null = null;
  indiceImagenActual = 0;

  constructor(
    private messageService: MessageService,
    private apiService: Api,
    private masterService: Master,
    private cookieService: CookieService
  ) { }

  ngOnInit() {
    console.log('=== MANTENIMIENTO ESTADOS COMPONENT INIT ===');
    this.obtenerUsuarioCookie();
    console.log('Usuario obtenido de cookie:', this.usuarioActual);
    this.inicializarFechasMes();
    console.log('Fechas inicializadas - Desde:', this.fechaDesde, 'Hasta:', this.fechaHasta);
    this.cargarSucursales();
    this.cargarSolicitudes();
  }

  obtenerUsuarioCookie() {
    this.usuarioActual = this.cookieService.get('usuario') || '';
  }

  inicializarFechasMes() {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    this.fechaDesde = this.formatearFecha(primerDia);
    this.fechaHasta = this.formatearFecha(ultimoDia);
  }

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  cargarSucursales() {
    this.masterService.getSucursales().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sucursales = response.data.map((suc: any) => ({
            label: suc.descripcion,
            value: suc.idSucursal
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar sucursales:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las sucursales',
          life: 3000
        });
      }
    });
  }

  // Método para buscar proveedores mientras escribe
  buscarProveedoresMientrasEscribe(event: any) {
    const query = (event.target as HTMLInputElement).value;
    this.filtroProveedor = query;

    // Limpiar timeout anterior
    if (this.busquedaTimeout) {
      clearTimeout(this.busquedaTimeout);
    }

    // Si tiene menos de 3 caracteres, limpiar resultados
    if (query.length < 3) {
      this.proveedoresFiltrados = [];
      this.proveedorSeleccionado = null;
      return;
    }

    // Debounce de 300ms
    this.busquedaTimeout = setTimeout(() => {
      this.cargandoProveedores = true;

      this.masterService.buscarProveedores(query).subscribe({
        next: (response) => {
          console.log('Proveedores encontrados:', response);

          this.proveedoresFiltrados = Array.isArray(response)
            ? response.map((p: any) => ({
              idclieprov: p.idCliente || p.nrodocumento,
              razon_social: p.name,
              documento: p.documento,
              nrodocumento: p.nrodocumento,
              telefono: p.telefono,
              email: p.email,
              direccion: p.direccion
            }))
            : [];

          this.cargandoProveedores = false;
        },
        error: (error) => {
          this.cargandoProveedores = false;
          console.error('Error al buscar proveedores:', error);

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron buscar los proveedores',
            life: 3000
          });
        }
      });
    }, 300);
  }

  // Seleccionar proveedor de la lista
  seleccionarProveedorDeLista(proveedor: any) {
    this.proveedorSeleccionado = proveedor;
    this.filtroProveedor = proveedor.razon_social;
    this.proveedoresFiltrados = []; // Ocultar dropdown

    console.log('Proveedor seleccionado:', proveedor);
  }

  cargarSolicitudes() {
    const params = {
      solicitanteUsuario: this.solicitanteFiltro,
      estado: this.estadoFiltro,
      prioridad: this.prioridadFiltro,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta
    };

    console.log('Parámetros enviados al API:', params);

    this.cargando = true;

    this.apiService.getSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        this.cargando = false;

        console.log('Respuesta completa del API:', response);

        let datos = [];

        if (Array.isArray(response)) {
          datos = response;
        } else if (response.success && response.data) {
          datos = response.data;
        } else if (response.data && Array.isArray(response.data)) {
          datos = response.data;
        }

        if (datos.length > 0) {
          this.solicitudes = datos.map((item: any) => {
            console.log('Item estado original:', item.estado, 'ID:', item.id);

            const estadoCodigo = item.estado ? item.estado.trim().toUpperCase() : 'PEN';

            return {
              id: item.id,
              prioridad: item.prioridad,
              prioridadNombre: this.obtenerNombrePrioridad(item.prioridad),
              tipo: item.tipo,
              tipoNombre: this.obtenerNombreTipo(item.tipo),
              descripcion: item.descripcion,
              solicitante: item.solicitanteUsuario,
              sitio: item.sucursal,
              sitioNombre: this.obtenerNombreSucursal(item.sucursal),
              estado: this.convertirEstadoANumero(estadoCodigo),
              estadoNombre: this.obtenerNombreEstadoPorCodigo(estadoCodigo),
              estadoCodigo: estadoCodigo,
              fechaCreacion: item.fechaCreacion,
              fechaInicio: item.fechaInicio,
              fechaFin: item.fechaFin,
              fechaCierre: item.fechaCierre,
              proveedor: item.proveedor,
              nombreProveedor: item.nombreProveedor,
              totalDocumentos: item.totalDocumentos,
              fotos: []
            };
          });

          console.log('Solicitudes mapeadas:', this.solicitudes);
        } else {
          console.warn('No hay datos en la respuesta');
          this.solicitudes = [];
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar solicitudes:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las solicitudes',
          life: 3000
        });
      }
    });
  }

  obtenerNombreSucursal(idSucursal: string): string {
    const sucursal = this.sucursales.find(s => s.value === idSucursal);
    return sucursal ? sucursal.label : idSucursal;
  }

  convertirEstadoANumero(estado: string): number {
    if (!estado) return 1;

    const estadoNormalizado = estado.trim().toUpperCase();

    switch (estadoNormalizado) {
      case 'PEN': return 1;
      case 'ESP': return 2;
      case 'CON': return 3;
      case 'PRO': return 4;
      case 'COM': return 5;
      case 'ASI': return 6;
      case 'EJE': return 7;
      case 'COT': return 8;
      case 'FIN': return 9;
      default:
        console.warn('Estado desconocido para conversión:', estado);
        return 1;
    }
  }

  obtenerNombreEstadoPorCodigo(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoNormalizado = estado.trim().toUpperCase();

    switch (estadoNormalizado) {
      case 'PEN': return 'Pendiente';
      case 'ESP': return 'Espera de Presupuesto';
      case 'CON': return 'Control';
      case 'PRO': return 'En Proceso';
      case 'COM': return 'Completado';
      case 'ASI': return 'Asignado';
      case 'EJE': return 'En Ejecución';
      case 'COT': return 'Contabilidad';
      case 'FIN': return 'Finalizado';
      default:
        console.warn('Estado desconocido recibido:', estado);
        return `Desconocido (${estado})`;
    }
  }

  obtenerNombreEstadoLog(estado: string): string {
    const nombre = this.obtenerNombreEstadoPorCodigo(estado);
    return nombre;
  }

  obtenerNombrePrioridad(prioridad: string): string {
    if (!prioridad) return 'N/A';
    const item = this.prioridades.find(p => p.value === prioridad);
    return item ? item.label : 'N/A';
  }

  obtenerNombreTipo(tipo: string): string {
    const item = this.tipos.find(t => t.value === tipo);
    return item ? item.label : 'N/A';
  }

  aplicarFiltros() {
    this.cargarSolicitudes();
  }

  limpiarFiltros() {
    this.estadoFiltro = '';
    this.prioridadFiltro = '';
    this.solicitanteFiltro = '';
    this.inicializarFechasMes();
    this.cargarSolicitudes();
  }

  verDetalle(solicitud: SolicitudMantenimiento) {
    this.solicitudSeleccionada = solicitud;
    this.mostrarDetalle = true;
    this.cargarLogs(solicitud.id);
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.solicitudSeleccionada = null;
    this.logs = [];
  }

  cargarLogs(idSolicitud: number) {
    this.cargandoLogs = true;
    this.logs = [];

    this.apiService.consultarLogSolicitudMantenimiento(idSolicitud).subscribe({
      next: (response) => {
        this.cargandoLogs = false;

        let datos = [];
        if (Array.isArray(response)) {
          datos = response;
        } else if (response.success && response.data) {
          datos = response.data;
        } else if (response.data && Array.isArray(response.data)) {
          datos = response.data;
        }

        this.logs = datos.sort((a: any, b: any) => {
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        });

        console.log('Logs cargados:', this.logs);
      },
      error: (error) => {
        this.cargandoLogs = false;
        console.error('Error al cargar logs:', error);
      }
    });
  }

  abrirSeleccionProveedores(solicitud: SolicitudMantenimiento) {
    this.solicitudProveedores = solicitud;
    this.presupuestos = [];
    this.proveedorSeleccionado = null;
    this.filtroProveedor = '';
    this.proveedoresFiltrados = [];
    this.mostrarProveedores = true;
    this.cargarLogs(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id, 'proveedores');
  }

  cerrarSeleccionProveedores() {
    this.mostrarProveedores = false;
    this.solicitudProveedores = null;
    this.presupuestos = [];
    this.proveedorSeleccionado = null;
    this.filtroProveedor = '';
    this.proveedoresFiltrados = [];
    this.logs = [];

    if (this.busquedaTimeout) {
      clearTimeout(this.busquedaTimeout);
    }
  }

  agregarProveedor() {
    if (!this.proveedorSeleccionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: 'Debe seleccionar un proveedor de la lista',
        life: 3000
      });
      return;
    }

    // Verificar si ya está agregado
    const yaExiste = this.presupuestos.some(p => p.idclieprov === this.proveedorSeleccionado.idclieprov);
    if (yaExiste) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Proveedor duplicado',
        detail: 'Este proveedor ya fue agregado',
        life: 3000
      });
      return;
    }

    this.presupuestos.push({
      idclieprov: this.proveedorSeleccionado.idclieprov,
      razon_social: this.proveedorSeleccionado.razon_social,
      monto: 0,
      editando: true
    });

    // Limpiar después de agregar
    this.proveedorSeleccionado = null;
    this.filtroProveedor = '';
    this.proveedoresFiltrados = [];

    this.messageService.add({
      severity: 'success',
      summary: 'Proveedor agregado',
      detail: 'El proveedor se agregó correctamente',
      life: 2000
    });
  }

  eliminarProveedor(proveedor: PresupuestoProveedor) {
    this.presupuestos = this.presupuestos.filter(p => p.idclieprov !== proveedor.idclieprov);
  }

  onRowEditInit(presupuesto: PresupuestoProveedor) {
    presupuesto.editando = true;
  }

  onRowEditSave(presupuesto: PresupuestoProveedor) {
    if (presupuesto.monto > 0) {
      presupuesto.editando = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Monto guardado',
        detail: 'El presupuesto se guardó correctamente',
        life: 2000
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El monto debe ser mayor a 0',
        life: 3000
      });
    }
  }

  onRowEditCancel(presupuesto: PresupuestoProveedor) {
    presupuesto.editando = false;
  }

  guardarProveedores() {
    if (this.presupuestos.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Debe agregar al menos un proveedor',
        life: 3000
      });
      return;
    }

    const sinMonto = this.presupuestos.filter(p => !p.monto || p.monto <= 0);
    if (sinMonto.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Todos los proveedores deben tener un monto de presupuesto',
        life: 3000
      });
      return;
    }

    if (!this.solicitudProveedores || !this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información necesaria',
        life: 3000
      });
      return;
    }

    this.cargando = true;
    const idSolicitud = this.solicitudProveedores.id;
    const fechaActual = new Date().toISOString();

    let presupuestosGuardados = 0;
    const totalPresupuestos = this.presupuestos.length;

    this.presupuestos.forEach((presupuesto) => {
      const params = {
        id: 0,
        idSolicitudMantenimiento: idSolicitud,
        idClieProv: presupuesto.idclieprov,
        monto: presupuesto.monto,
        fecha: fechaActual
      };

      this.apiService.guardarSolicitudMantenimientoPresupuesto(params).subscribe({
        next: (response) => {
          presupuestosGuardados++;
          console.log(`Presupuesto guardado ${presupuestosGuardados}/${totalPresupuestos}:`, presupuesto.razon_social);

          if (presupuestosGuardados === totalPresupuestos) {
            this.cambiarEstadoAControl(idSolicitud);
          }
        },
        error: (error) => {
          this.cargando = false;
          console.error('Error al guardar presupuesto:', error);

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Error al guardar presupuesto de ${presupuesto.razon_social}`,
            life: 3000
          });
        }
      });
    });
  }

  cambiarEstadoAControl(idSolicitud: number) {
    const params = {
      id: idSolicitud,
      estado: 'CON',
      usuario: this.usuarioActual,
      fechaInicio: '',
      fechaFin: '',
      fechaCierre: '',
      proveedor: '',
      tipoDocumento: '',
      serie: '',
      numero: ''
    };

    this.apiService.editarSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        console.log('Estado cambiado a Control:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Presupuestos registrados',
          detail: `Se registraron ${this.presupuestos.length} presupuesto(s) y la solicitud cambió a Control`,
          life: 3000
        });

        this.cerrarSeleccionProveedores();
        this.cargando = false;

        setTimeout(() => {
          this.cargarSolicitudes();
        }, 100);
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cambiar estado:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Ocurrió un error al cambiar el estado a Control',
          life: 3000
        });
      }
    });
  }

  esControl(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'CON';
  }

  abrirAsignacion(solicitud: SolicitudMantenimiento) {
    this.solicitudAsignacion = solicitud;
    this.presupuestosListado = [];
    this.proveedorAsignado = '';
    this.mostrarAsignacion = true;
    this.cargarLogs(solicitud.id);
    this.cargarPresupuestos(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id, 'asignacion');
  }

  cerrarAsignacion() {
    this.mostrarAsignacion = false;
    this.solicitudAsignacion = null;
    this.presupuestosListado = [];
    this.proveedorAsignado = '';
    this.logs = [];
  }

  cargarPresupuestos(idSolicitudMantenimiento: number) {
    this.cargando = true;

    this.apiService.listarSolicitudMantenimientoPresupuesto(idSolicitudMantenimiento).subscribe({
      next: (response) => {
        console.log('Presupuestos cargados:', response);

        let datos = [];
        if (Array.isArray(response)) {
          datos = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          datos = response.data;
        } else if (response && Array.isArray(response.data)) {
          datos = response.data;
        }

        this.presupuestosListado = datos.map((p: any) => ({
          id: p.id,
          idSolicitudMantenimiento: p.idSolicitudMantenimiento,
          idClieProv: p.idClieProv,
          proveedor: p.proveedor,
          monto: p.monto,
          fecha: p.fecha,
          seleccionado: false
        }));

        this.cargando = false;
        console.log('Presupuestos mapeados:', this.presupuestosListado);
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar presupuestos:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los presupuestos',
          life: 3000
        });
      }
    });
  }

  seleccionarProveedor(presupuesto: PresupuestoListado) {
    this.presupuestosListado.forEach(p => p.seleccionado = false);

    presupuesto.seleccionado = true;
    this.proveedorAsignado = presupuesto.idClieProv;

    console.log('Proveedor seleccionado:', presupuesto.proveedor, presupuesto.idClieProv);
  }

  asignarProveedor() {
    if (!this.proveedorAsignado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: 'Debe seleccionar un proveedor',
        life: 3000
      });
      return;
    }

    if (!this.solicitudAsignacion || !this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información necesaria',
        life: 3000
      });
      return;
    }

    this.cargando = true;

    const params = {
      id: this.solicitudAsignacion.id,
      estado: 'ASI',
      usuario: this.usuarioActual,
      fechaInicio: '',
      fechaFin: '',
      fechaCierre: '',
      proveedor: this.proveedorAsignado,
      tipoDocumento: '',
      serie: '',
      numero: ''
    };

    this.apiService.editarSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        console.log('Proveedor asignado:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Proveedor Asignado',
          detail: 'El proveedor ha sido asignado correctamente',
          life: 3000
        });

        this.cerrarAsignacion();
        this.cargando = false;

        setTimeout(() => {
          this.cargarSolicitudes();
        }, 100);
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al asignar proveedor:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Ocurrió un error al asignar el proveedor',
          life: 3000
        });
      }
    });
  }

  solicitarPresupuesto(solicitud: SolicitudMantenimiento) {
    if (!this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el usuario actual',
        life: 3000
      });
      return;
    }

    const params = {
      id: solicitud.id,
      estado: 'ESP',
      usuario: this.usuarioActual,
      fechaInicio: '',
      fechaFin: '',
      fechaCierre: '',
      proveedor: '',
      tipoDocumento: '',
      serie: '',
      numero: ''
    };

    this.cargando = true;

    this.apiService.editarSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        console.log('Estado cambiado a Espera de Presupuesto:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Presupuesto Solicitado',
          detail: `La solicitud #${solicitud.id} ha sido enviada a espera de presupuesto`,
          life: 3000
        });

        this.cargando = false;

        setTimeout(() => {
          this.cargarSolicitudes();
        }, 100);
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al solicitar presupuesto:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Ocurrió un error al solicitar el presupuesto',
          life: 3000
        });
      }
    });
  }

  esPendiente(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'PEN';
  }

  esEsperaPresupuesto(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'ESP';
  }

  getPrioridadColor(prioridad: string): string {
    switch (prioridad) {
      case '1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case '2': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case '3': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case '4': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  getEstadoColor(estado: number): string {
    switch (estado) {
      case 1: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 2: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 3: return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
      case 4: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 5: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 6: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 7: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 8: return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
      case 9: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  esAsignado(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'ASI';
  }

  abrirEjecucion(solicitud: SolicitudMantenimiento) {
    this.solicitudEjecucion = solicitud;
    this.fechaInicio = null;
    this.mostrarEjecucion = true;
    this.cargarLogs(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id, 'ejecucion');
  }

  cerrarEjecucion() {
    this.mostrarEjecucion = false;
    this.solicitudEjecucion = null;
    this.fechaInicio = null;
    this.logs = [];
  }

  ejecutarMantenimiento() {
    if (!this.fechaInicio) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha requerida',
        detail: 'Debe seleccionar una fecha de inicio',
        life: 3000
      });
      return;
    }

    if (!this.solicitudEjecucion || !this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información necesaria',
        life: 3000
      });
      return;
    }

    this.cargando = true;

    const fechaInicioISO = this.fechaInicio.toISOString();

    const params = {
      solicitanteUsuario: '',
      estado: '',
      prioridad: '',
      fechaDesde: '',
      fechaHasta: ''
    };

    this.apiService.getSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        let datos = Array.isArray(response) ? response : (response.data || []);
        const solicitudActual = datos.find((s: any) => s.id === this.solicitudEjecucion!.id);

        if (!solicitudActual) {
          this.cargando = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener la información de la solicitud',
            life: 3000
          });
          return;
        }

        const updateParams = {
          id: this.solicitudEjecucion!.id,
          estado: 'EJE',
          usuario: this.usuarioActual,
          fechaInicio: fechaInicioISO,
          fechaFin: solicitudActual.fechaFin || '',
          fechaCierre: solicitudActual.fechaCierre || '',
          proveedor: solicitudActual.proveedor || '',
          tipoDocumento: solicitudActual.tipoDocumento || '',
          serie: solicitudActual.serie || '',
          numero: solicitudActual.numero || ''
        };

        this.apiService.editarSolicitudMantenimiento(updateParams).subscribe({
          next: (response) => {
            console.log('Mantenimiento puesto en ejecución:', response);

            this.messageService.add({
              severity: 'success',
              summary: 'En Ejecución',
              detail: 'El mantenimiento ha sido puesto en ejecución',
              life: 3000
            });

            this.cerrarEjecucion();
            this.cargando = false;

            setTimeout(() => {
              this.cargarSolicitudes();
            }, 100);
          },
          error: (error) => {
            this.cargando = false;
            console.error('Error al ejecutar mantenimiento:', error);

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Ocurrió un error al poner en ejecución el mantenimiento',
              life: 3000
            });
          }
        });
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al obtener solicitud:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la información de la solicitud',
          life: 3000
        });
      }
    });
  }

  esEnEjecucion(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'EJE';
  }

  abrirContabilidad(solicitud: SolicitudMantenimiento) {
    this.solicitudContabilidad = solicitud;
    this.fechaFin = null;
    this.mostrarContabilidad = true;
    this.cargarLogs(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id, 'contabilidad');
  }

  cerrarContabilidad() {
    this.mostrarContabilidad = false;
    this.solicitudContabilidad = null;
    this.fechaFin = null;
    this.logs = [];
  }

  enviarAContabilidad() {
    if (!this.fechaFin) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha requerida',
        detail: 'Debe seleccionar una fecha de finalización',
        life: 3000
      });
      return;
    }

    if (!this.solicitudContabilidad || !this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información necesaria',
        life: 3000
      });
      return;
    }

    this.cargando = true;

    const fechaFinISO = this.fechaFin.toISOString();

    const params = {
      solicitanteUsuario: '',
      estado: '',
      prioridad: '',
      fechaDesde: '',
      fechaHasta: ''
    };

    this.apiService.getSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        let datos = Array.isArray(response) ? response : (response.data || []);
        const solicitudActual = datos.find((s: any) => s.id === this.solicitudContabilidad!.id);

        if (!solicitudActual) {
          this.cargando = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener la información de la solicitud',
            life: 3000
          });
          return;
        }

        const updateParams = {
          id: this.solicitudContabilidad!.id,
          estado: 'COT',
          usuario: this.usuarioActual,
          fechaInicio: solicitudActual.fechaInicio || '',
          fechaFin: fechaFinISO,
          fechaCierre: solicitudActual.fechaCierre || '',
          proveedor: solicitudActual.proveedor || '',
          tipoDocumento: solicitudActual.tipoDocumento || '',
          serie: solicitudActual.serie || '',
          numero: solicitudActual.numero || ''
        };

        this.apiService.editarSolicitudMantenimiento(updateParams).subscribe({
          next: (response) => {
            console.log('Mantenimiento enviado a contabilidad:', response);

            this.messageService.add({
              severity: 'success',
              summary: 'Enviado a Contabilidad',
              detail: 'El mantenimiento ha sido enviado a contabilidad',
              life: 3000
            });

            this.cerrarContabilidad();
            this.cargando = false;

            setTimeout(() => {
              this.cargarSolicitudes();
            }, 100);
          },
          error: (error) => {
            this.cargando = false;
            console.error('Error al enviar a contabilidad:', error);

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Ocurrió un error al enviar a contabilidad',
              life: 3000
            });
          }
        });
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al obtener solicitud:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la información de la solicitud',
          life: 3000
        });
      }
    });
  }

  esContabilidad(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'COT';
  }

  esFinalizado(solicitud: SolicitudMantenimiento): boolean {
    return solicitud.estadoCodigo === 'FIN';
  }

  abrirVerFinalizado(solicitud: SolicitudMantenimiento) {
    this.solicitudVerFinalizado = solicitud;
    this.documentosFinalizados = [];
    this.mostrarVerFinalizado = true;
    this.cargarLogs(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id, 'verFinalizado');
    this.cargarDocumentosFinalizados(solicitud.id);
  }

  cerrarVerFinalizado() {
    this.mostrarVerFinalizado = false;
    this.solicitudVerFinalizado = null;
    this.documentosFinalizados = [];
    this.logs = [];
  }

  cargarDocumentosFinalizados(idSolicitud: number) {
    this.cargandoDocumentosFinalizados = true;

    this.apiService.listarSolicitudMantenimientoDocumento(idSolicitud).subscribe({
      next: (response) => {
        console.log('Documentos finalizados cargados:', response);

        let datos = [];
        if (Array.isArray(response)) {
          datos = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          datos = response.data;
        }

        this.documentosFinalizados = datos.map((doc: any) => {
          const serieNumero = this.extraerSerieNumero(doc.idcarpeta);
          return {
            id: doc.id,
            idsolicitudmantenimiento: doc.idsolicitudmantenimiento,
            idcarpeta: doc.idcarpeta,
            tipoDocumento: doc.tipoDocumento,
            importebruto: doc.importebruto,
            importeneto: doc.importeneto,
            fechaemision: doc.fechaemision,
            idcarpetapadre: doc.idcarpetapadre,
            serie: serieNumero.serie,
            numero: serieNumero.numero
          };
        });

        this.cargandoDocumentosFinalizados = false;

        console.log('Documentos finalizados mapeados:', this.documentosFinalizados);
      },
      error: (error) => {
        this.cargandoDocumentosFinalizados = false;
        console.error('Error al cargar documentos finalizados:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los documentos',
          life: 3000
        });
      }
    });
  }

  eliminarDocumentoFinalizado(documento: any) {
    if (!confirm(`¿Está seguro de eliminar el documento ${documento.serie}-${documento.numero}?`)) {
      return;
    }

    this.cargando = true;

    this.apiService.eliminarSolicitudMantenimientoDocumento(documento.id).subscribe({
      next: (response) => {
        console.log('Documento eliminado:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Documento Eliminado',
          detail: `El documento ${documento.serie}-${documento.numero} fue eliminado`,
          life: 3000
        });

        // Recargar lista de documentos
        if (this.solicitudVerFinalizado) {
          this.cargarDocumentosFinalizados(this.solicitudVerFinalizado.id);
        }

        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al eliminar documento:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el documento',
          life: 3000
        });
      }
    });
  }

  abrirFinalizacion(solicitud: SolicitudMantenimiento) {
    this.solicitudFinalizacion = solicitud;
    this.filtroDocumento = '';
    this.documentosFiltrados = [];
    this.documentoTemporal = null;
    this.documentosSeleccionados = [];
    this.mostrarFinalizacion = true;
    this.cargarLogs(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id, 'finalizacion');

    // Cargar documentos del proveedor automáticamente
    this.cargarDocumentosProveedorConRUC(solicitud.id);
  }

  cargarDocumentosProveedorConRUC(idSolicitud: number) {
    this.cargandoDocumentos = true;
    this.documentosFiltrados = [];
    this.proveedorInfo = null;

    this.apiService.consultarSolicitudMantenimiento(idSolicitud).subscribe({
      next: (response) => {
        console.log('Solicitud consultada:', response);

        if (response && response.proveedor) {
          const proveedorRuc = response.proveedor;

          this.proveedorInfo = {
            ruc: proveedorRuc,
            nombre: response.nombreProveedor || 'Proveedor sin nombre'
          };

          // BUSCAR DOCUMENTOS AUTOMÁTICAMENTE
          this.masterService.buscarDocumentoCobrarPagar(proveedorRuc).subscribe({
            next: (documentos) => {
              console.log('Documentos del proveedor encontrados:', documentos);

              this.documentosFiltrados = Array.isArray(documentos)
                ? documentos.map((doc: any) => {
                  const serieNumero = this.extraerSerieNumero(doc.idcarpeta);
                  return {
                    tipoDocumento: doc.tipoDocumento,
                    idcarpeta: doc.idcarpeta,
                    importebruto: doc.importebruto,
                    importeneto: doc.importeneto,
                    fechaemision: doc.fechaemision,
                    idcarpetapadre: doc.idcarpetapadre,
                    serieNumero: serieNumero,
                    displayLabel: `${serieNumero.serie}-${serieNumero.numero}`
                  };
                })
                : [];

              this.cargandoDocumentos = false;

              if (this.documentosFiltrados.length > 0) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Documentos cargados',
                  detail: `Se encontraron ${this.documentosFiltrados.length} documento(s) del proveedor`,
                  life: 3000
                });
              } else {
                this.messageService.add({
                  severity: 'info',
                  summary: 'Sin documentos',
                  detail: `No se encontraron documentos para el proveedor ${proveedorRuc}`,
                  life: 3000
                });
              }
            },
            error: (error) => {
              this.cargandoDocumentos = false;
              console.error('Error al buscar documentos del proveedor:', error);

              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los documentos del proveedor',
                life: 3000
              });
            }
          });
        } else {
          this.cargandoDocumentos = false;
          this.proveedorInfo = null;
          console.warn('No se encontró proveedor en la solicitud');

          this.messageService.add({
            severity: 'warn',
            summary: 'Sin proveedor',
            detail: 'Esta solicitud no tiene un proveedor asignado',
            life: 3000
          });
        }
      },
      error: (error) => {
        this.cargandoDocumentos = false;
        console.error('Error al consultar solicitud:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo consultar la información de la solicitud',
          life: 3000
        });
      }
    });
  }

  buscarDocumentosDelProveedor() {
    if (!this.filtroDocumento || this.filtroDocumento.length < 11) {
      this.messageService.add({
        severity: 'warn',
        summary: 'RUC inválido',
        detail: 'El RUC debe tener 11 dígitos',
        life: 3000
      });
      return;
    }

    this.cargandoDocumentos = true;
    this.documentosFiltrados = [];

    this.masterService.buscarDocumentoCobrarPagar(this.filtroDocumento).subscribe({
      next: (documentos) => {
        console.log('Documentos del proveedor encontrados:', documentos);

        this.documentosFiltrados = Array.isArray(documentos)
          ? documentos.map((doc: any) => ({
            tipoDocumento: doc.tipoDocumento,
            idcarpeta: doc.idcarpeta,
            importebruto: doc.importebruto,
            importeneto: doc.importeneto,
            fechaemision: doc.fechaemision,
            idcarpetapadre: doc.idcarpetapadre,
            serieNumero: this.extraerSerieNumero(doc.idcarpeta)
          }))
          : [];

        this.cargandoDocumentos = false;

        if (this.documentosFiltrados.length > 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Documentos encontrados',
            detail: `Se encontraron ${this.documentosFiltrados.length} documento(s)`,
            life: 3000
          });
        } else {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin documentos',
            detail: 'No se encontraron documentos para este RUC',
            life: 3000
          });
        }
      },
      error: (error) => {
        this.cargandoDocumentos = false;
        console.error('Error al buscar documentos del proveedor:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los documentos',
          life: 3000
        });
      }
    });
  }

  cerrarFinalizacion() {
    this.mostrarFinalizacion = false;
    this.solicitudFinalizacion = null;
    this.filtroDocumento = '';
    this.documentosFiltrados = [];
    this.documentoTemporal = null;
    this.documentosSeleccionados = [];
    this.proveedorInfo = null;
    this.logs = [];

    if (this.busquedaDocumentoTimeout) {
      clearTimeout(this.busquedaDocumentoTimeout);
    }
  }

  seleccionarDocumentoDeLista(documento: any) {
    this.documentoTemporal = documento;
    console.log('Documento temporal seleccionado:', documento);
  }

  agregarDocumento() {
    if (!this.documentoTemporal) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: 'Debe seleccionar un documento de la lista',
        life: 3000
      });
      return;
    }

    // Verificar si ya está agregado
    const yaExiste = this.documentosSeleccionados.some(d => d.idcarpeta === this.documentoTemporal.idcarpeta);
    if (yaExiste) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Documento duplicado',
        detail: 'Este documento ya fue agregado',
        life: 3000
      });
      return;
    }

    this.documentosSeleccionados.push({
      idcarpeta: this.documentoTemporal.idcarpeta,
      tipoDocumento: this.documentoTemporal.tipoDocumento,
      serie: this.documentoTemporal.serieNumero.serie,
      numero: this.documentoTemporal.serieNumero.numero,
      importebruto: this.documentoTemporal.importebruto,
      importeneto: this.documentoTemporal.importeneto,
      fechaemision: this.documentoTemporal.fechaemision,
      editando: false
    });

    // Solo limpiar el select
    this.documentoTemporal = null;

    this.messageService.add({
      severity: 'success',
      summary: 'Documento agregado',
      detail: 'El documento se agregó correctamente',
      life: 2000
    });
  }

  eliminarDocumento(documento: DocumentoSeleccionado) {
    this.documentosSeleccionados = this.documentosSeleccionados.filter(d => d.idcarpeta !== documento.idcarpeta);
  }

  finalizarMantenimiento() {
    if (this.documentosSeleccionados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Debe agregar al menos un documento',
        life: 3000
      });
      return;
    }

    if (!this.solicitudFinalizacion || !this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información necesaria',
        life: 3000
      });
      return;
    }

    this.cargando = true;
    const idSolicitud = this.solicitudFinalizacion.id;

    // Primero guardar todos los documentos
    let documentosGuardados = 0;
    const totalDocumentos = this.documentosSeleccionados.length;

    console.log(`Iniciando guardado de ${totalDocumentos} documento(s)...`);

    this.documentosSeleccionados.forEach((documento) => {
      this.apiService.guardarSolicitudMantenimientoDocumento(idSolicitud, documento.idcarpeta).subscribe({
        next: (response) => {
          documentosGuardados++;
          console.log(`Documento guardado ${documentosGuardados}/${totalDocumentos}:`, documento.idcarpeta);

          // Cuando todos los documentos estén guardados, cambiar estado a FIN
          if (documentosGuardados === totalDocumentos) {
            this.cambiarEstadoAFinalizado(idSolicitud);
          }
        },
        error: (error) => {
          this.cargando = false;
          console.error('Error al guardar documento:', error);

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Error al guardar documento ${documento.serie}-${documento.numero}`,
            life: 3000
          });
        }
      });
    });
  }

  cambiarEstadoAFinalizado(idSolicitud: number) {
    const fechaCierreISO = new Date().toISOString();

    const params = {
      solicitanteUsuario: '',
      estado: '',
      prioridad: '',
      fechaDesde: '',
      fechaHasta: ''
    };

    this.apiService.getSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        let datos = Array.isArray(response) ? response : (response.data || []);
        const solicitudActual = datos.find((s: any) => s.id === idSolicitud);

        if (!solicitudActual) {
          this.cargando = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener la información de la solicitud',
            life: 3000
          });
          return;
        }

        const updateParams = {
          id: idSolicitud,
          estado: 'FIN',
          usuario: this.usuarioActual,
          fechaInicio: solicitudActual.fechaInicio || '',
          fechaFin: solicitudActual.fechaFin || '',
          fechaCierre: fechaCierreISO,
          proveedor: solicitudActual.proveedor || '',
          tipoDocumento: '',
          serie: '',
          numero: ''
        };

        this.apiService.editarSolicitudMantenimiento(updateParams).subscribe({
          next: (response) => {
            console.log('Mantenimiento finalizado:', response);

            this.messageService.add({
              severity: 'success',
              summary: 'Mantenimiento Finalizado',
              detail: `El mantenimiento ha sido finalizado con ${this.documentosSeleccionados.length} documento(s) guardado(s)`,
              life: 3000
            });

            this.cerrarFinalizacion();
            this.cargando = false;

            setTimeout(() => {
              this.cargarSolicitudes();
            }, 100);
          },
          error: (error) => {
            this.cargando = false;
            console.error('Error al finalizar mantenimiento:', error);

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Ocurrió un error al finalizar el mantenimiento',
              life: 3000
            });
          }
        });
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al obtener solicitud:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la información de la solicitud',
          life: 3000
        });
      }
    });
  }

  cargarFotosDesdeS3(idSolicitud: number, contexto: 'proveedores' | 'asignacion' | 'ejecucion' | 'contabilidad' | 'finalizacion' | 'verFinalizado') {
    const ruta = `SM${idSolicitud}`;

    let solicitudActual: SolicitudMantenimiento | null = null;

    switch (contexto) {
      case 'proveedores':
        solicitudActual = this.solicitudProveedores;
        break;
      case 'asignacion':
        solicitudActual = this.solicitudAsignacion;
        break;
      case 'ejecucion':
        solicitudActual = this.solicitudEjecucion;
        break;
      case 'contabilidad':
        solicitudActual = this.solicitudContabilidad;
        break;
      case 'finalizacion':
        solicitudActual = this.solicitudFinalizacion;
        break;
      case 'verFinalizado':
        solicitudActual = this.solicitudVerFinalizado;
        break;
    }

    if (!solicitudActual) return;

    solicitudActual.cargandoFotos = true;
    solicitudActual.fotos = [];

    this.apiService.listarArchivos(ruta).subscribe({
      next: (response) => {
        console.log('📸 Fotos desde S3:', response);

        if (solicitudActual) {
          solicitudActual.cargandoFotos = false;

          if (Array.isArray(response)) {
            solicitudActual.fotos = response.map((foto: any) => ({
              id: foto.key,
              url: foto.url,
              nombre: foto.name,
              size: foto.size,
              lastModified: foto.lastModified
            }));

            console.log(`✅ ${solicitudActual.fotos.length} foto(s) cargadas para ${contexto}`);
          } else {
            console.warn('⚠️ Respuesta no es un array');
          }
        }
      },
      error: (error) => {
        if (solicitudActual) {
          solicitudActual.cargandoFotos = false;
        }

        console.error('❌ Error al cargar fotos desde S3:', error);

        if (error.status !== 404) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las fotos',
            life: 3000
          });
        }
      }
    });
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  verImagen(foto: FotoMantenimiento, fotos: FotoMantenimiento[]) {
    this.imagenSeleccionada = foto;
    this.indiceImagenActual = fotos.findIndex(f => f.id === foto.id);
    this.mostrarImagenModal = true;
  }

  cerrarImagenModal() {
    this.mostrarImagenModal = false;
    this.imagenSeleccionada = null;
  }

  buscarDocumentosMientrasEscribe(event: any) {
    const query = (event.target as HTMLInputElement).value;
    this.filtroDocumento = query;

    if (this.busquedaDocumentoTimeout) {
      clearTimeout(this.busquedaDocumentoTimeout);
    }

    if (query.length < 11) {
      this.documentosFiltrados = [];
      this.documentoTemporal = null;
      return;
    }

    this.busquedaDocumentoTimeout = setTimeout(() => {
      this.cargandoDocumentos = true;

      this.masterService.buscarDocumentoCobrarPagar(query).subscribe({
        next: (response) => {
          console.log('Documentos encontrados:', response);

          this.documentosFiltrados = Array.isArray(response)
            ? response.map((doc: any) => ({
              tipoDocumento: doc.tipoDocumento,
              idcarpeta: doc.idcarpeta,
              importebruto: doc.importebruto,
              importeneto: doc.importeneto,
              fechaemision: doc.fechaemision,
              idcarpetapadre: doc.idcarpetapadre,
              serieNumero: this.extraerSerieNumero(doc.idcarpeta)
            }))
            : [];

          this.cargandoDocumentos = false;
        },
        error: (error) => {
          this.cargandoDocumentos = false;
          console.error('Error al buscar documentos:', error);

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron buscar los documentos',
            life: 3000
          });
        }
      });
    }, 300);
  }

  extraerSerieNumero(idcarpeta: string): { serie: string, numero: string } {
    if (!idcarpeta) return { serie: '', numero: '' };

    try {
      const partes = idcarpeta.split('_');
      if (partes.length >= 2) {
        const serieNumero = partes[1].split('-');
        return {
          serie: serieNumero[0] || '',
          numero: serieNumero[1] || ''
        };
      }
    } catch (error) {
      console.error('Error al extraer serie-número:', error);
    }

    return { serie: '', numero: '' };
  }
}
// mantenimiento.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
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
  fechaCreacion: string;
  fechaInicio: string;
  fechaFin: string | null;
  fechaCierre: string | null;
  proveedor: string | null;
  nombreProveedor: string | null;
  tipoDocumento: string | null;
  serie: string | null;
  numero: string | null;
  fotos: FotoMantenimiento[];
  cargandoFotos: boolean;
}

interface LogMantenimiento {
  id: number;
  idSolicitudMantenimiento: number;
  estadoInicial: string;
  estadoFinal: string;
  usuario: string;
  fecha: string;
}

interface FotoMantenimiento {
  id: string;
  url: string;
  nombre: string;
  archivo?: File;
  size?: number;
  lastModified?: string;
}

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    TextareaModule,
    FileUploadModule,
    ToastModule,
    TooltipModule,
    Menu
  ],
  templateUrl: './mantenimiento.html',
  styleUrls: ['./mantenimiento.css'],
  providers: [MessageService]
})
export class Mantenimiento implements OnInit {
  solicitudes: SolicitudMantenimiento[] = [];
  cargando = false;

  // Modal crear/editar
  mostrarFormulario = false;
  modoEdicion = false;

  // Formulario
  prioridadSeleccionada = '';
  tipoSeleccionado = '';
  descripcion = '';
  sitioSeleccionado = '';
  fotosNuevas: FotoMantenimiento[] = [];

  // Usuario actual
  usuarioActual = '';

  // Opciones
  prioridades: any[] = [
    { label: 'Todas', value: '' },
    { label: 'Baja', value: '1' },
    { label: 'Media', value: '2' },
    { label: 'Alta', value: '3' },
    { label: 'Urgente', value: '4' }
  ];

  // Prioridades para el formulario (sin "Todas")
  prioridadesForm: any[] = [
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

  sucursales: any[] = [];

  // Filtros
  estadoFiltro = '';
  prioridadFiltro = '';
  fechaDesde = '';
  fechaHasta = '';

  estados: any[] = [
    { label: 'Todos', value: '' },
    { label: 'Pendiente', value: 'PEN' },
    { label: 'Espera de Presupuesto', value: 'ESP' },
    { label: 'Control', value: 'CON' },
    { label: 'Asignado', value: 'ASI' },
    { label: 'En Ejecución', value: 'EJE' },
    { label: 'Contabilidad', value: 'COT' },
    { label: 'Finalizado', value: 'FIN' }
  ];

  // Modal detalle
  mostrarDetalle = false;
  solicitudSeleccionada: SolicitudMantenimiento | null = null;
  logsSolicitud: LogMantenimiento[] = [];
  cargandoLogs = false;

  // Modal imagen
  mostrarImagenModal = false;
  imagenSeleccionada: FotoMantenimiento | null = null;
  indiceImagenActual = 0;

  constructor(
    private messageService: MessageService,
    private apiService: Api,
    private masterService: Master,
    private cookieService: CookieService
  ) {}

  ngOnInit() {
    console.log('=== MANTENIMIENTO COMPONENT INIT ===');
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

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  cargarSolicitudes() {
    if (!this.usuarioActual) {
      console.error('No hay usuario en cookies');
      return;
    }

    const params = {
      solicitanteUsuario: this.usuarioActual,
      estado: this.estadoFiltro,
      prioridad: this.prioridadFiltro,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta
    };

    console.log('Parámetros enviados al API:', params);
    console.log('Usuario actual:', this.usuarioActual);

    this.cargando = true;

    this.apiService.getSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        this.cargando = false;

        console.log('Respuesta completa del API:', response);
        console.log('response.success:', response.success);
        console.log('response.data:', response.data);

        // El API devuelve directamente el array, no un objeto con success/data
        let datos = [];
        
        if (Array.isArray(response)) {
          // Respuesta es array directo
          datos = response;
        } else if (response.success && response.data) {
          // Respuesta es objeto con success/data
          datos = response.data;
        } else if (response.data && Array.isArray(response.data)) {
          // Por si acaso data existe pero success no
          datos = response.data;
        }

        if (datos.length > 0) {
          this.solicitudes = datos.map((item: any) => ({
            id: item.id,
            prioridad: item.prioridad,
            prioridadNombre: this.obtenerNombrePrioridad(item.prioridad),
            tipo: item.tipo,
            tipoNombre: this.obtenerNombreTipo(item.tipo),
            descripcion: item.descripcion,
            solicitante: item.solicitanteUsuario,
            sitio: item.sucursal,
            sitioNombre: item.nombreSucursal || item.sucursal,
            estado: this.convertirEstadoANumero(item.estado),
            estadoNombre: this.obtenerNombreEstadoPorCodigo(item.estado),
            fechaCreacion: item.fechaCreacion,
            fechaInicio: item.fechaInicio,
            fechaFin: item.fechaFin,
            fechaCierre: item.fechaCierre,
            proveedor: item.proveedor,
            nombreProveedor: item.nombreProveedor,
            tipoDocumento: item.tipoDocumento,
            serie: item.serie,
            numero: item.numero,
            fotos: [],
            cargandoFotos: false
          }));
          
          console.log('Solicitudes mapeadas:', this.solicitudes);
        } else {
          console.warn('No hay datos en la respuesta');
          this.solicitudes = [];
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar solicitudes:', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las solicitudes',
          life: 3000
        });
      }
    });
  }

  cargarFotosDesdeS3(idSolicitud: number) {
    if (!this.solicitudSeleccionada) return;

    const ruta = `SM${idSolicitud}`;
    this.solicitudSeleccionada.cargandoFotos = true;
    this.solicitudSeleccionada.fotos = [];

    this.apiService.listarArchivos(ruta).subscribe({
      next: (response) => {
        if (Array.isArray(response) && this.solicitudSeleccionada) {
          this.solicitudSeleccionada.fotos = response.map((foto: any) => ({
            id: foto.key,
            url: foto.url,
            nombre: foto.name,
            size: foto.size,
            lastModified: foto.lastModified
          }));
        }
        if (this.solicitudSeleccionada) {
          this.solicitudSeleccionada.cargandoFotos = false;
        }
      },
      error: (error) => {
        if (this.solicitudSeleccionada) {
          this.solicitudSeleccionada.cargandoFotos = false;
        }
        // Error 404 silencioso (carpeta vacía)
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

  obtenerNombreSucursal(idSucursal: string): string {
    const sucursal = this.sucursales.find(s => s.value === idSucursal);
    return sucursal ? sucursal.label : idSucursal;
  }

  convertirEstadoANumero(estado: string): number {
    if (!estado) return 1;
    
    // Normalizar: quitar espacios y convertir a mayúsculas
    const estadoNormalizado = estado.trim().toUpperCase();
    
    switch(estadoNormalizado) {
      case 'PEN': return 1; // Pendiente
      case 'ESP': return 2; // Espera de presupuesto
      case 'CON': return 3; // Control
      case 'PRO': return 4; // En Proceso
      case 'COM': return 5; // Completado
      case 'ASI': return 6; // Asignado
      case 'EJE': return 7; // En Ejecución
      case 'COT': return 8; // Contabilidad
      case 'FIN': return 9; // Finalizado
      default: 
        console.warn('Estado desconocido para conversión:', estado);
        return 1;
    }
  }

  obtenerNombreEstadoPorCodigo(estado: string): string {
    if (!estado) return 'Desconocido';
    
    // Normalizar: quitar espacios y convertir a mayúsculas
    const estadoNormalizado = estado.trim().toUpperCase();
    
    switch(estadoNormalizado) {
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
    this.inicializarFechasMes();
    this.cargarSolicitudes();
  }

  exportarExcel() {
    if (!this.solicitudes.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay registros para exportar',
        life: 3000
      });
      return;
    }

    const filas = this.solicitudes.map((item) => ({
      ID: item.id,
      Prioridad: item.prioridadNombre,
      Tipo: item.tipoNombre,
      Descripcion: item.descripcion,
      Solicitante: item.solicitante,
      Sitio: item.sitioNombre,
      Estado: item.estadoNombre,
      FechaCreacion: this.formatearFechaExcel(item.fechaCreacion),
      FechaInicio: this.formatearFechaExcel(item.fechaInicio),
      FechaFin: this.formatearFechaExcel(item.fechaFin),
      FechaCierre: this.formatearFechaExcel(item.fechaCierre),
      Proveedor: item.nombreProveedor || item.proveedor || ''
    }));

    const contenidoHtml = this.generarTablaHtmlExcel(filas);
    const blob = new Blob([contenidoHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `mantenimiento_${this.formatearFecha(new Date())}.xls`;
    enlace.click();
    window.URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Exportación completa',
      detail: 'Se descargó el archivo Excel',
      life: 3000
    });
  }

  private formatearFechaExcel(fecha?: string | null): string {
    if (!fecha) return '';
    const fechaObj = new Date(fecha);
    if (Number.isNaN(fechaObj.getTime())) return fecha;
    return fechaObj.toLocaleString('es-PE');
  }

  private generarTablaHtmlExcel(filas: Record<string, string | number>[]): string {
    const encabezados = Object.keys(filas[0] || {});
    const th = encabezados.map((header) => `<th>${header}</th>`).join('');
    const tr = filas
      .map((fila) => {
        const celdas = encabezados
          .map((header) => `<td>${this.escaparHtml(String(fila[header] ?? ''))}</td>`)
          .join('');
        return `<tr>${celdas}</tr>`;
      })
      .join('');

    return `
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <table border="1">
          <thead><tr>${th}</tr></thead>
          <tbody>${tr}</tbody>
        </table>
      </body>
      </html>
    `;
  }

  private escaparHtml(valor: string): string {
    return valor
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  nuevaSolicitud() {
    this.modoEdicion = false;
    this.limpiarFormulario();
    this.mostrarFormulario = true;
  }

  limpiarFormulario() {
    this.prioridadSeleccionada = '';
    this.tipoSeleccionado = '';
    this.descripcion = '';
    this.sitioSeleccionado = '';
    this.fotosNuevas = [];
  }

  onFileSelect(event: any) {
    console.log('=== onFileSelect DISPARADO ===');
    console.log('Event completo:', event);
    console.log('event.files:', event.files);
    console.log('event.currentFiles:', event.currentFiles);
    
    // IMPORTANTE: event.files son los NUEVOS archivos seleccionados
    // event.currentFiles son TODOS los archivos (incluidos los previos)
    // Usamos event.files para evitar duplicados
    const files = event.files; // ← CAMBIO: solo archivos nuevos
    
    if (!files || files.length === 0) {
      console.warn('⚠️ No se recibieron archivos');
      return;
    }

    console.log(`📁 Procesando ${files.length} archivo(s) NUEVO(S)`);
    
    for (const file of files) {
      console.log('Archivo:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size);
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log('✅ Archivo leído:', file.name);
        this.fotosNuevas.push({
          id: Date.now().toString() + Math.random(),
          url: e.target.result,
          nombre: file.name,
          archivo: file
        });
        console.log('Total fotos en memoria:', this.fotosNuevas.length);
      };
      reader.onerror = (error) => {
        console.error('❌ Error al leer archivo:', error);
      };
      reader.readAsDataURL(file);
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Foto agregada',
      detail: `${files.length} foto(s) agregada(s)`,
      life: 2000
    });
  }

  eliminarFoto(foto: FotoMantenimiento) {
    this.fotosNuevas = this.fotosNuevas.filter(f => f.id !== foto.id);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Foto eliminada',
      detail: 'La foto ha sido eliminada',
      life: 2000
    });
  }

  guardarSolicitud() {
    // Validaciones
    if (!this.prioridadSeleccionada || !this.tipoSeleccionado || 
        !this.descripcion.trim() || !this.sitioSeleccionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Complete todos los campos requeridos',
        life: 3000
      });
      return;
    }

    if (!this.usuarioActual) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de sesión',
        detail: 'No se pudo obtener el usuario actual',
        life: 3000
      });
      return;
    }

    const params = {
      prioridad: this.prioridadSeleccionada,
      tipo: this.tipoSeleccionado,
      solicitanteUsuario: this.usuarioActual,
      sucursal: this.sitioSeleccionado,
      descripcion: this.descripcion
    };

    this.cargando = true;

    this.apiService.crearSolicitudMantenimiento(params).subscribe({
      next: (response) => {
        console.log('📥 Respuesta del API crear solicitud:', response);

        // El API crea la solicitud pero devuelve vacío
        // Necesitamos recargar para obtener el ID de la última solicitud creada
        
        if (this.fotosNuevas.length > 0) {
          console.log('📸 Hay fotos para subir, buscando ID de la solicitud recién creada...');
          
          // Recargar solicitudes para obtener la última creada
          const paramsRecargar = {
            solicitanteUsuario: this.usuarioActual,
            estado: '',
            prioridad: '',
            fechaDesde: this.formatearFecha(new Date()), // Solo hoy
            fechaHasta: this.formatearFecha(new Date())
          };

          this.apiService.getSolicitudMantenimiento(paramsRecargar).subscribe({
            next: (responseListado) => {
              console.log('📥 Listado de solicitudes:', responseListado);

              let datos = [];
              if (Array.isArray(responseListado)) {
                datos = responseListado;
              } else if (responseListado.success && responseListado.data) {
                datos = responseListado.data;
              } else if (responseListado.data && Array.isArray(responseListado.data)) {
                datos = responseListado.data;
              }

              if (datos.length > 0) {
                // Ordenar por ID descendente para obtener la última
                datos.sort((a: any, b: any) => b.id - a.id);
                const ultimaSolicitud = datos[0];
                const idSolicitud = ultimaSolicitud.id;

                console.log('🆔 ID de última solicitud creada:', idSolicitud);
                console.log('📸 Iniciando subida de fotos...');

                // Ahora sí, subir fotos con el ID correcto
                this.subirFotos(idSolicitud);
              } else {
                this.cargando = false;
                console.warn('⚠️ No se encontraron solicitudes después de crear');
                
                this.messageService.add({
                  severity: 'warn',
                  summary: 'Solicitud creada',
                  detail: 'La solicitud fue creada pero no se pudieron subir las fotos',
                  life: 4000
                });

                this.cerrarFormulario();
                this.cargarSolicitudes();
              }
            },
            error: (error) => {
              this.cargando = false;
              console.error('❌ Error al recargar solicitudes:', error);
              
              this.messageService.add({
                severity: 'warn',
                summary: 'Solicitud creada',
                detail: 'La solicitud fue creada pero no se pudieron subir las fotos',
                life: 4000
              });

              this.cerrarFormulario();
              this.cargarSolicitudes();
            }
          });
        } else {
          // No hay fotos, solo mostrar éxito
          this.cargando = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Solicitud creada',
            detail: 'La solicitud de mantenimiento ha sido creada exitosamente',
            life: 3000
          });

          this.cerrarFormulario();
          this.cargarSolicitudes();
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al crear solicitud:', error);
        
        const errorMsg = error?.error?.message || error?.message || 'Ocurrió un error al crear la solicitud';
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg,
          life: 3000
        });
      }
    });
  }

  subirFotos(idSolicitud: number) {
    const carpeta = `SM${idSolicitud}`;
    let fotosSubidas = 0;
    let errores = 0;

    console.log('=== INICIANDO SUBIDA DE FOTOS ===');
    console.log('ID Solicitud:', idSolicitud);
    console.log('Carpeta:', carpeta);
    console.log('Total fotos a subir:', this.fotosNuevas.length);

    this.fotosNuevas.forEach((foto, index) => {
      if (!foto.archivo) {
        console.warn(`⚠️ Foto ${index + 1} no tiene archivo adjunto`);
        fotosSubidas++;
        return;
      }

      console.log(`--- Foto ${index + 1}/${this.fotosNuevas.length} ---`);
      console.log('Nombre:', foto.nombre);
      console.log('Tipo archivo.type:', foto.archivo.type);
      console.log('Tamaño:', (foto.archivo.size / 1024).toFixed(2), 'KB');

      // Determinar tipo de archivo (imagen o pdf)
      const tipoArchivo = foto.archivo.type.includes('pdf') ? 'pdf' : 'imagen';
      console.log('Tipo determinado:', tipoArchivo);

      // Llamar API con File directamente (como en checklist.ts)
      this.apiService.subirArchivo(idSolicitud, foto.archivo, tipoArchivo).subscribe({
        next: (response) => {
          fotosSubidas++;
          console.log(`✅ Foto ${index + 1} subida exitosamente`);
          console.log('Respuesta S3:', response);

          // Cuando todas las fotos terminen (éxito o error)
          if (fotosSubidas + errores === this.fotosNuevas.length) {
            this.finalizarSubida(fotosSubidas, errores);
          }
        },
        error: (error) => {
          errores++;
          console.error(`❌ Error al subir foto ${index + 1}:`, error);
          console.error('Status:', error.status);
          console.error('Error completo:', error);

          // Cuando todas las fotos terminen (éxito o error)
          if (fotosSubidas + errores === this.fotosNuevas.length) {
            this.finalizarSubida(fotosSubidas, errores);
          }
        }
      });
    });
  }

  finalizarSubida(exitosas: number, fallidas: number) {
    this.cargando = false;

    if (fallidas === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud creada',
        detail: `Solicitud creada con ${exitosas} foto(s) adjunta(s)`,
        life: 3000
      });
    } else if (exitosas > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Solicitud creada con advertencias',
        detail: `${exitosas} foto(s) subida(s), ${fallidas} fallaron`,
        life: 4000
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al subir fotos',
        detail: 'La solicitud fue creada pero las fotos no se pudieron subir',
        life: 4000
      });
    }

    this.cerrarFormulario();
    this.cargarSolicitudes();
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.limpiarFormulario();
  }

  verDetalle(solicitud: SolicitudMantenimiento) {
    this.solicitudSeleccionada = solicitud;
    this.mostrarDetalle = true;
    this.cargarLogs(solicitud.id);
    this.cargarFotosDesdeS3(solicitud.id);
  }

  cargarLogs(idSolicitud: number) {
    this.cargandoLogs = true;
    this.logsSolicitud = [];

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

        this.logsSolicitud = datos.map((log: any) => ({
          id: log.id,
          idSolicitudMantenimiento: log.idSolicitudMantenimiento,
          estadoInicial: log.estadoInicial,
          estadoFinal: log.estadoFinal,
          usuario: log.usuario,
          fecha: log.fecha
        }));

        console.log('Logs cargados:', this.logsSolicitud);
      },
      error: (error) => {
        this.cargandoLogs = false;
        console.error('Error al cargar logs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los logs de seguimiento',
          life: 3000
        });
      }
    });
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.solicitudSeleccionada = null;
    this.logsSolicitud = [];
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

  getPrioridadColor(prioridad: string): string {
    switch(prioridad) {
      case '1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case '2': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case '3': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case '4': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  getEstadoColor(estado: number): string {
    switch(estado) {
      case 1: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'; // Pendiente
      case 2: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'; // Espera
      case 3: return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300'; // Control
      case 4: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'; // En Proceso
      case 5: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'; // Completado
      case 6: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'; // Asignado
      case 7: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'; // En Ejecución
      case 8: return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300'; // Contabilidad
      case 9: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'; // Finalizado
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }
}

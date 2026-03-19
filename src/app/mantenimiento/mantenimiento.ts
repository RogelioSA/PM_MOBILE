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
  fotos: FotoMantenimiento[];
}

interface FotoMantenimiento {
  id: string;
  url: string;
  nombre: string;
  archivo?: File;
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
            sitioNombre: item.nombreSucursal || item.sucursal, // Usar nombreSucursal del API
            estado: this.convertirEstadoANumero(item.estado),
            estadoNombre: this.obtenerNombreEstadoPorCodigo(item.estado),
            fechaCreacion: item.fechaCreacion,
            fotos: []
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
    const files = event.currentFiles || event.files;
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotosNuevas.push({
          id: Date.now().toString() + Math.random(),
          url: e.target.result,
          nombre: file.name,
          archivo: file
        });
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
        // Validación defensiva de respuesta
        if (!response) {
          this.cargando = false;
          console.warn('Respuesta vacía del API');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se recibió respuesta del servidor',
            life: 3000
          });
          return;
        }

        if (response.success) {
          const idSolicitud = response.data?.id || response.id;
          
          // Si hay fotos, subirlas
          if (this.fotosNuevas.length > 0 && idSolicitud) {
            this.subirFotos(idSolicitud);
          } else {
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
        } else {
          this.cargando = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.message || 'No se pudo crear la solicitud',
            life: 3000
          });
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

    this.fotosNuevas.forEach((foto, index) => {
      if (!foto.archivo) {
        fotosSubidas++;
        return;
      }

      // Convertir archivo a base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result.split(',')[1]; // Quitar el prefijo data:image/...;base64,
        const extension = foto.nombre.split('.').pop() || 'jpg';

        const params = {
          carpeta: carpeta,
          archivo: base64,
          tipoArchivo: extension
        };

        this.apiService.subirArchivo(params).subscribe({
          next: (response) => {
            fotosSubidas++;
            console.log(`Foto ${index + 1} subida:`, response);

            // Cuando todas las fotos terminen (éxito o error)
            if (fotosSubidas + errores === this.fotosNuevas.length) {
              this.finalizarSubida(fotosSubidas, errores);
            }
          },
          error: (error) => {
            errores++;
            console.error(`Error al subir foto ${index + 1}:`, error);

            // Cuando todas las fotos terminen (éxito o error)
            if (fotosSubidas + errores === this.fotosNuevas.length) {
              this.finalizarSubida(fotosSubidas, errores);
            }
          }
        });
      };

      reader.readAsDataURL(foto.archivo);
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
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.solicitudSeleccionada = null;
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
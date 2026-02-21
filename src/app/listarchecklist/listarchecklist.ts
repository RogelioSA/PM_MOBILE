// listarchecklist.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { Api } from '../services/api';
import { Master } from '../services/master';
import { Menu } from '../menu/menu';

interface ChecklistItem {
  idRecepcionVehiculo: number;
  sucursalNombre: string;
  almacenNombre: string;
  marcaNombre: string;
  modeloNombre: string;
  colorNombre: string;
  kilometraje: string;
  nuevo: boolean;
  activo: boolean;
  nroChasis: string;
  nroStock: string;
  transportista: string;
  conductor: string;
  fechaRecepcion: string;
  fechaRegistro: string;
  fechaLlegada: string;
  observaciones: string;
  nombreTecnico: string;
  detalle: any[];
}

interface EquipamientoConDescripcion {
  codigo: string;
  descripcion: string;
  valor: string;
}

interface FotoChecklist {
  id: string;
  url: string;
  nombre: string;
}

@Component({
  selector: 'app-listarchecklist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ToastModule,
    DialogModule,
    TextareaModule,
    Menu
  ],
  templateUrl: './listarchecklist.html',
  styleUrls: ['./listarchecklist.css'],
  providers: [MessageService]
})
export class Listarchecklist implements OnInit {
  checklists: ChecklistItem[] = [];
  checklistsFiltrados: ChecklistItem[] = [];
  cargando = false;

  // Filtros
  busqueda = '';
  sucursalSeleccionada = '';
  almacenSeleccionado = '';
  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;

  // Opciones de filtros
  sucursales: any[] = [];
  almacenes: any[] = [];

  // Modal de detalle
  mostrarDetalle = false;
  checklistSeleccionado: ChecklistItem | null = null;
  cargandoDetalle = false;
  cargandoFotos = false;
  fotos: FotoChecklist[] = [];
  equipamientoCol1: EquipamientoConDescripcion[] = [];
  equipamientoCol2: EquipamientoConDescripcion[] = [];

  // Modal de imagen
  mostrarImagenModal = false;
  imagenSeleccionada: FotoChecklist | null = null;
  indiceImagenActual = 0;
  
  private readonly equipamientoDescripciones: { [key: string]: string } = {
    '1': 'TAPA DE PIN',
    '2': 'ANTENA',
    '3': 'LLAVES DE CONTACTO/SIMPLES',
    '4': 'LLAVES DE COMANDO',
    '5': 'RADIO FABRICA',
    '6': 'CHIP GPS',
    '7': 'MANUAL DE USO',
    '8': 'CENISERO',
    '9': 'ENCENDEDOR',
    '10': 'TAPA DE FUSIBLES',
    '11': 'TARJETA CODE',
    '12': 'CABLE AUXILIAR',
    '13': 'COBERTOR',
    '14': 'LLANTA DE REPUESTO',
    '15': 'LLAVE DE BOCA',
    '16': 'LLAVE DE RUEDA',
    '17': 'TRIANGULO DE SEGURIDAD',
    '18': 'PIN DE REMOLQUE',
    '19': 'DESARMADOR',
    '20': 'ACOPLE',
    '21': 'LLAVE ALLEN',
    '22': 'LLAVE TUBULAR',
    '23': 'EXTINTOR',
    '24': 'MARTILLO',
    '25': 'LLAVE FRANCESA',
    '26': 'LLAVE CORONA',
    '27': 'ALICATE',
    '28': 'MANIVELA',
    '29': 'COPAS DE AROS',
    '30': 'TACOS METALICOS',
    '31': 'VASOS DE AROS',
    '32': 'LLAVEROS',
    '33': 'MANUAL DE GARANTIA',
    '34': 'PISOS',
    '35': 'PORTADOCUMENTO',
    '36': 'EMBLEMA',
    '37': 'BOLSA DE SEGUROS',
    '38': 'VALVULA DE GAS',
    '39': 'GATA/PALANCA',
    '40': 'PORTA PLACAS'
  };

  constructor(
    private api: Api,
    private master: Master,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.inicializarFechas();
    this.cargarSucursales();
    this.cargarChecklists();
  }

  inicializarFechas() {
    const hoy = new Date();
    this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  }

  cargarSucursales() {
    this.master.getSucursales().subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.sucursales = [
            { label: 'Todas las sucursales', value: '' },
            ...response.data.map((item: any) => ({
              label: item.descripcion,
              value: item.idSucursal
            }))
          ];
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las sucursales',
          life: 3000
        });
      }
    });
  }

  cargarAlmacenesPorSucursal(idSucursal: string) {
    if (!idSucursal) {
      this.almacenes = [{ label: 'Todos los almacenes', value: '' }];
      this.almacenSeleccionado = '';
      return;
    }

    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.almacenes = [
            { label: 'Todos los almacenes', value: '' },
            ...response.map((item: any) => ({
              label: item.nombre,
              value: item.id
            }))
          ];
          this.almacenSeleccionado = '';
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los almacenes',
          life: 3000
        });
      }
    });
  }

  onSucursalChange() {
    this.cargarAlmacenesPorSucursal(this.sucursalSeleccionada);
    this.cargarChecklists();
  }

  cargarChecklists() {
    if (!this.fechaInicio || !this.fechaFin) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Debe seleccionar fecha de inicio y fin',
        life: 3000
      });
      return;
    }

    this.cargando = true;
    const fechaInicioStr = this.formatearFecha(this.fechaInicio);
    const fechaFinStr = this.formatearFecha(this.fechaFin);

    this.api.listarChecklistsPDI(
      fechaInicioStr,
      fechaFinStr,
      this.sucursalSeleccionada || '',
      this.almacenSeleccionado || ''
    ).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.checklists = response;
        } else if (response?.success && Array.isArray(response.data)) {
          this.checklists = response.data;
        } else if (response?.data && Array.isArray(response.data)) {
          this.checklists = response.data;
        } else {
          this.checklists = [];
        }

        this.aplicarFiltros();
        this.cargando = false;

        if (this.checklists.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin resultados',
            detail: 'No se encontraron checklists con los filtros aplicados',
            life: 3000
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'No se pudieron cargar los checklists',
          life: 3000
        });
        this.checklists = [];
        this.checklistsFiltrados = [];
        this.cargando = false;
      }
    });
  }

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  aplicarFiltros() {
    this.checklistsFiltrados = this.checklists.filter(item => {
      const matchBusqueda = !this.busqueda ||
        item.nroStock?.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        item.nroChasis?.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        item.marcaNombre?.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        item.modeloNombre?.toLowerCase().includes(this.busqueda.toLowerCase());

      return matchBusqueda;
    });
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.sucursalSeleccionada = '';
    this.almacenSeleccionado = '';
    this.inicializarFechas();
    this.almacenes = [{ label: 'Todos los almacenes', value: '' }];
    this.cargarChecklists();

    this.messageService.add({
      severity: 'info',
      summary: 'Filtros limpiados',
      detail: 'Se restablecieron los filtros predeterminados',
      life: 2000
    });
  }

  verDetalle(checklist: ChecklistItem) {
    this.mostrarDetalle = true;
    this.cargandoDetalle = true;
    this.fotos = [];
    this.equipamientoCol1 = [];
    this.equipamientoCol2 = [];

    this.api.obtenerChecklistPDI(checklist.idRecepcionVehiculo).subscribe({
      next: (response: any) => {
        if (response?.success && response?.data) {
          this.checklistSeleccionado = response.data;
        } else if (response?.data) {
          this.checklistSeleccionado = response.data;
        } else {
          this.checklistSeleccionado = response;
        }

        // Procesar equipamiento
        if (this.checklistSeleccionado?.detalle && Array.isArray(this.checklistSeleccionado.detalle)) {
          const equipamientoConDescripcion = this.checklistSeleccionado.detalle
            .filter(item => item.codigo && item.valor)
            .map(item => ({
              codigo: item.codigo!,
              descripcion: item.descripcion || this.equipamientoDescripciones[item.codigo!] || item.codigo!,
              valor: item.valor!
            }));

          const mitad = Math.ceil(equipamientoConDescripcion.length / 2);
          this.equipamientoCol1 = equipamientoConDescripcion.slice(0, mitad);
          this.equipamientoCol2 = equipamientoConDescripcion.slice(mitad);
        }

        // Cargar fotos
        if (this.checklistSeleccionado?.nroStock) {
          this.cargarFotos(this.checklistSeleccionado.nroStock);
        }

        this.cargandoDetalle = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'No se pudo cargar el checklist',
          life: 3000
        });
        this.cargandoDetalle = false;
        this.mostrarDetalle = false;
      }
    });
  }

  cargarFotos(stock: string): void {
    this.cargandoFotos = true;

    this.api.listarArchivosChecklist(stock).subscribe({
      next: (response) => {
        let archivos: any[] = [];

        if (response?.success && Array.isArray(response.data)) {
          archivos = response.data;
        } else if (Array.isArray(response)) {
          archivos = response;
        }

        this.fotos = archivos.map((archivo: any) => ({
          id: archivo.key || archivo.id || Date.now().toString() + Math.random(),
          url: archivo.url,
          nombre: archivo.name || archivo.nombre || archivo.archivo || 'Imagen'
        }));

        this.cargandoFotos = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Aviso',
          detail: 'No se pudieron cargar las fotos del checklist',
          life: 3000
        });
        this.fotos = [];
        this.cargandoFotos = false;
      }
    });
  }

  verImagen(foto: FotoChecklist): void {
    this.imagenSeleccionada = foto;
    this.indiceImagenActual = this.fotos.findIndex(f => f.id === foto.id);
    this.mostrarImagenModal = true;
  }

  cerrarImagenModal(): void {
    this.mostrarImagenModal = false;
    this.imagenSeleccionada = null;
  }

  descargarImagen(foto: FotoChecklist): void {
    window.open(foto.url, '_blank');
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.checklistSeleccionado = null;
    this.fotos = [];
    this.equipamientoCol1 = [];
    this.equipamientoCol2 = [];
  }

  exportarExcel() {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportando',
      detail: 'Generando archivo Excel...',
      life: 3000
    });
  }
}
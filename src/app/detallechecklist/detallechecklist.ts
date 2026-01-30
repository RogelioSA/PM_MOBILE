import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { Menu } from '../menu/menu';
import { Api } from '../services/api';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface ChecklistDetalle {
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
  fechaLlegada: string;
  fechaRecepcion: string;
  fechaRegistro: string;
  observaciones: string;
  nombreTecnico: string;
  detalle: EquipamientoDetalle[];
}

interface EquipamientoDetalle {
  codigo: string | null;
  descripcion?: string;
  valor: string | null;
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
  selector: 'app-detallechecklist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Menu,
    InputTextModule,
    ButtonModule,
    DatePickerModule,
    TextareaModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './detallechecklist.html',
  styleUrls: ['./detallechecklist.css']
})
export class Detallechecklist implements OnInit {

  checklist: ChecklistDetalle | null = null;
  cargando = true;
  cargandoFotos = false;
  fotos: FotoChecklist[] = [];

  // Equipamiento dividido en columnas
  equipamientoCol1: EquipamientoConDescripcion[] = [];
  equipamientoCol2: EquipamientoConDescripcion[] = [];

  // Mapeo de códigos a descripciones
  private readonly equipamientoDescripciones: { [key: string]: string } = {
    'EQ001': 'TAPA DE PIN',
    'EQ002': 'ANTENA',
    'EQ003': 'LLAVES DE CONTACTO/SIMPLES',
    'EQ004': 'LLAVES DE COMANDO',
    'EQ005': 'RADIO FABRICA',
    'EQ006': 'CHIP GPS',
    'EQ007': 'MANUAL DE USO',
    'EQ008': 'CENISERO',
    'EQ009': 'ENCENDEDOR',
    'EQ010': 'TAPA DE FUSIBLES',
    'EQ011': 'TARJETA CODE',
    'EQ012': 'CABLE AUXILIAR',
    'EQ013': 'COBERTOR',
    'EQ014': 'LLANTA DE REPUESTO',
    'EQ015': 'LLAVE DE BOCA',
    'EQ016': 'LLAVE DE RUEDA',
    'EQ017': 'TRIANGULO DE SEGURIDAD',
    'EQ018': 'PIN DE REMOLQUE',
    'EQ019': 'DESARMADOR',
    'EQ020': 'ACOPLE',
    'EQ021': 'LLAVE ALLEN',
    'EQ022': 'LLAVE TUBULAR',
    'EQ023': 'EXTINTOR',
    'EQ024': 'MARTILLO',
    'EQ025': 'LLAVE FRANCESA',
    'EQ026': 'LLAVE CORONA',
    'EQ027': 'ALICATE',
    'EQ028': 'MANIVELA',
    'EQ029': 'COPAS DE AROS',
    'EQ030': 'TACOS METALICOS',
    'EQ031': 'VASOS DE AROS',
    'EQ032': 'LLAVEROS',
    'EQ033': 'MANUAL DE GARANTIA',
    'EQ034': 'PISOS',
    'EQ035': 'PORTADOCUMENTO',
    'EQ036': 'EMBLEMA',
    'EQ037': 'BOLSA DE SEGUROS',
    'EQ038': 'VALVULA DE GAS',
    'EQ039': 'GATA/PALANCA',
    'EQ040': 'PORTA PLACAS'
  };

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id && !isNaN(id)) {
      this.cargarDetalle(id);
    } else {
      console.error('❌ ID inválido');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de checklist inválido',
        life: 3000
      });
      this.cargando = false;
    }
  }

  cargarDetalle(idRecepcionVehiculo: number) {
    this.cargando = true;

    this.api.obtenerChecklistPDI(idRecepcionVehiculo).subscribe({
      next: (response: any) => {

        // Manejar diferentes estructuras de respuesta
        if (response?.success && response?.data) {
          this.checklist = response.data;
        } else if (response?.data) {
          this.checklist = response.data;
        } else {
          this.checklist = response;
        }

        // Procesar equipamiento con descripciones
        if (this.checklist?.detalle && Array.isArray(this.checklist.detalle)) {
          const equipamientoConDescripcion = this.checklist.detalle
            .filter(item => item.codigo && item.valor)
            .map(item => ({
              codigo: item.codigo!,
              descripcion: item.descripcion || this.equipamientoDescripciones[item.codigo!] || item.codigo!,
              valor: item.valor!
            }));

          // Dividir en dos columnas
          const mitad = Math.ceil(equipamientoConDescripcion.length / 2);
          this.equipamientoCol1 = equipamientoConDescripcion.slice(0, mitad);
          this.equipamientoCol2 = equipamientoConDescripcion.slice(mitad);
        }

        // Cargar fotos si existe nroStock
        if (this.checklist?.nroStock) {
          this.cargarFotos(this.checklist.nroStock);
        } else {
          console.warn('⚠️ No se encontró nroStock para cargar fotos');
        }

        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar checklist:', error);
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'No se pudo cargar el checklist',
          life: 3000
        });
        
        this.cargando = false;
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

        // Mapear archivos a fotos
        this.fotos = archivos.map((archivo: any) => ({
          id: archivo.key || archivo.id || Date.now().toString() + Math.random(),
          url: archivo.url, // URL directa de S3
          nombre: archivo.name || archivo.nombre || archivo.archivo || 'Imagen'
        }));

        if (this.fotos.length === 0) {
          console.log('ℹ️ No se encontraron fotos para este checklist');
        }

        this.cargandoFotos = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar fotos:', error);
        
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
    // Abrir imagen en nueva pestaña
    window.open(foto.url, '_blank');
  }
}
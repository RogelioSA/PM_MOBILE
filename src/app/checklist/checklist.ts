import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Menu } from '../menu/menu';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Api, ChecklistPDI } from '../services/api';
import { Master } from '../services/master';

interface Opcion {
  label: string;
  value: string;
}

interface EquipamientoItem {
  codigo: string;
  descripcion: string;
  valor: string | null;
}

interface FotoChecklist {
  id: string;
  url: string;
  nombre: string;
  file?: File;
  preview: string;
}

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Menu,
    SelectModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    DatePickerModule,
    RadioButtonModule,
    TextareaModule
  ],
  providers: [MessageService],
  templateUrl: './checklist.html',
  styleUrl: './checklist.css'
})
export class Checklist implements OnInit {
  form!: FormGroup;
  
  // Opciones para selects
  sucursales: Opcion[] = [];
  almacenes: Opcion[] = [];
  marcas: Opcion[] = [];
  modelos: Opcion[] = [];
  colores: Opcion[] = [];

  // Datos del vehículo
  kilometraje: string = '';
  condicionNuevo: boolean = false;
  condicionActivo: boolean = false;
  nroChasis: string = '';
  nroStock: string = '';

  // Equipamiento (columna izquierda) - AHORA CON CÓDIGO
  equipamientoCol1: EquipamientoItem[] = [
    { codigo: 'EQ001', descripcion: 'TAPA DE PIN', valor: null },
    { codigo: 'EQ002', descripcion: 'ANTENA', valor: null },
    { codigo: 'EQ003', descripcion: 'LLAVES DE CONTACTO/SIMPLES', valor: null },
    { codigo: 'EQ004', descripcion: 'LLAVES DE COMANDO', valor: null },
    { codigo: 'EQ005', descripcion: 'RADIO FABRICA', valor: null },
    { codigo: 'EQ006', descripcion: 'CHIP GPS', valor: null },
    { codigo: 'EQ007', descripcion: 'MANUAL DE USO', valor: null },
    { codigo: 'EQ008', descripcion: 'CENISERO', valor: null },
    { codigo: 'EQ009', descripcion: 'ENCENDEDOR', valor: null },
    { codigo: 'EQ010', descripcion: 'TAPA DE FUSIBLES', valor: null },
    { codigo: 'EQ011', descripcion: 'TARJETA CODE', valor: null },
    { codigo: 'EQ012', descripcion: 'CABLE AUXILIAR', valor: null },
    { codigo: 'EQ013', descripcion: 'COBERTOR', valor: null },
    { codigo: 'EQ014', descripcion: 'LLANTA DE REPUESTO', valor: null },
    { codigo: 'EQ015', descripcion: 'LLAVE DE BOCA', valor: null },
    { codigo: 'EQ016', descripcion: 'LLAVE DE RUEDA', valor: null },
    { codigo: 'EQ017', descripcion: 'TRIANGULO DE SEGURIDAD', valor: null },
    { codigo: 'EQ018', descripcion: 'PIN DE REMOLQUE', valor: null },
    { codigo: 'EQ019', descripcion: 'DESARMADOR', valor: null },
    { codigo: 'EQ020', descripcion: 'ACOPLE', valor: null }
  ];

  // Equipamiento (columna derecha) - AHORA CON CÓDIGO
  equipamientoCol2: EquipamientoItem[] = [
    { codigo: 'EQ021', descripcion: 'LLAVE ALLEN', valor: null },
    { codigo: 'EQ022', descripcion: 'LLAVE TUBULAR', valor: null },
    { codigo: 'EQ023', descripcion: 'EXTINTOR', valor: null },
    { codigo: 'EQ024', descripcion: 'MARTILLO', valor: null },
    { codigo: 'EQ025', descripcion: 'LLAVE FRANCESA', valor: null },
    { codigo: 'EQ026', descripcion: 'LLAVE CORONA', valor: null },
    { codigo: 'EQ027', descripcion: 'ALICATE', valor: null },
    { codigo: 'EQ028', descripcion: 'MANIVELA', valor: null },
    { codigo: 'EQ029', descripcion: 'COPAS DE AROS', valor: null },
    { codigo: 'EQ030', descripcion: 'TACOS METALICOS', valor: null },
    { codigo: 'EQ031', descripcion: 'VASOS DE AROS', valor: null },
    { codigo: 'EQ032', descripcion: 'LLAVEROS', valor: null },
    { codigo: 'EQ033', descripcion: 'MANUAL DE GARANTIA', valor: null },
    { codigo: 'EQ034', descripcion: 'PISOS', valor: null },
    { codigo: 'EQ035', descripcion: 'PORTADOCUMENTO', valor: null },
    { codigo: 'EQ036', descripcion: 'EMBLEMA', valor: null },
    { codigo: 'EQ037', descripcion: 'BOLSA DE SEGUROS', valor: null },
    { codigo: 'EQ038', descripcion: 'VALVULA DE GAS', valor: null },
    { codigo: 'EQ039', descripcion: 'GATA/PALANCA', valor: null },
    { codigo: 'EQ040', descripcion: 'PORTA PLACAS', valor: null }
  ];

  // Datos de transporte
  transportista: string = '';
  conductor: string = '';
  fechaLlegada: Date | null = null;
  observaciones: string = '';

  // Datos del técnico
  nombreTecnico: string = '';
  fechaRecepcion: Date | null = null;

  // Fotos
  fotos: FotoChecklist[] = [];
  maxFotos: number = 10;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private api: Api,
    private master: Master,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sucursal: [null, Validators.required],
      almacen: [null, Validators.required],
      marca: [null, Validators.required],
      modelo: [null, Validators.required],
      color: [null]
    });

    // Cargar catálogos iniciales
    this.cargarSucursales();
    this.cargarMarcas();
    this.cargarColores();

    // Reaccionar a cambios para cargar dependencias
    this.form.get('sucursal')?.valueChanges.subscribe(idSucursal => {
      if (idSucursal) {
        this.cargarAlmacenesPorSucursal(idSucursal);
      } else {
        this.almacenes = [];
        this.form.get('almacen')?.reset();
      }
    });

    this.form.get('marca')?.valueChanges.subscribe(idMarca => {
      if (idMarca) {
        this.cargarModelosPorMarca(idMarca);
      } else {
        this.modelos = [];
        this.form.get('modelo')?.reset();
      }
    });
  }

  // ==================== CARGA DE CATÁLOGOS ====================

  cargarSucursales() {
    this.master.getSucursales().subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.sucursales = response.data.map((item: any) => ({
            label: item.descripcion,
            value: item.idSucursal
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar sucursales', error);
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
    this.almacenes = [];
    this.form.get('almacen')?.reset();

    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.almacenes = response.map((item: any) => ({
            label: item.nombre,
            value: item.id
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar almacenes', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los almacenes',
          life: 3000
        });
      }
    });
  }

  cargarMarcas() {
    this.master.getMarcas().subscribe({
      next: (response) => {
        if (Array.isArray(response.data)) {
          this.marcas = response.data.map((item: any) => ({
            label: item.name,
            value: item.idBrand
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar marcas', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las marcas',
          life: 3000
        });
      }
    });
  }

  cargarModelosPorMarca(idBrand: string) {
    this.modelos = [];
    this.form.get('modelo')?.reset();

    this.master.getModelosPorMarca(idBrand).subscribe({
      next: (response) => {
        if (Array.isArray(response.data)) {
          this.modelos = response.data.map((item: any) => ({
            label: item.name,
            value: item.idModel
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar modelos', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los modelos',
          life: 3000
        });
      }
    });
  }

  cargarColores() {
    this.master.getColores().subscribe({
      next: (response) => {
        if (Array.isArray(response.data)) {
          this.colores = response.data.map((item: any) => ({
            label: item.name,
            value: item.idColor
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar colores', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los colores',
          life: 3000
        });
      }
    });
  }

  // ==================== MANEJO DE FOTOS ====================

  onFileSelect(event: any) {
    const files = event.files || event.target.files;
        
    if (!files || files.length === 0) {
      console.warn('⚠️ No se recibieron archivos');
      return;
    }

    if (this.fotos.length >= this.maxFotos) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: `Solo puede agregar hasta ${this.maxFotos} fotos`,
        life: 3000
      });
      return;
    }

    for (let file of files) {      
      if (this.fotos.length >= this.maxFotos) break;

      if (!file.type.startsWith('image/')) {
        console.warn('⚠️ Archivo no es imagen:', file.name);
        this.messageService.add({
          severity: 'warn',
          summary: 'Archivo inválido',
          detail: `${file.name} no es una imagen válida`,
          life: 3000
        });
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        console.warn('⚠️ Archivo muy grande:', file.name, file.size);
        this.messageService.add({
          severity: 'warn',
          summary: 'Archivo muy grande',
          detail: `${file.name} excede el límite de 5MB`,
          life: 3000
        });
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {        
        const dataUrl = e.target.result;
        const nuevaFoto: FotoChecklist = {
          id: Date.now().toString() + Math.random(),
          url: dataUrl,
          nombre: file.name,
          file: file,
          preview: dataUrl
        };

        this.fotos.push(nuevaFoto);        
        this.messageService.add({
          severity: 'success',
          summary: 'Foto agregada',
          detail: `${file.name} agregada correctamente`,
          life: 2000
        });
      };

      reader.onerror = (error) => {
        console.error('❌ Error al leer archivo:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo leer ${file.name}`,
          life: 3000
        });
      };

      reader.readAsDataURL(file);
    }
  }

  abrirCamara() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (event: any) => {
      this.onFileSelect(event);
    };

    input.click();
  }

  eliminarFoto(fotoId: string) {
    this.fotos = this.fotos.filter(f => f.id !== fotoId);    
    this.messageService.add({
      severity: 'info',
      summary: 'Foto eliminada',
      detail: 'La foto fue eliminada correctamente',
      life: 2000
    });
  }

  // ==================== GUARDAR CHECKLIST ====================

  guardarChecklist(): void {
    // Validar campos obligatorios del formulario
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Complete los campos obligatorios (Sucursal, Almacén, Marca, Modelo)',
        life: 3000
      });
      return;
    }

    // Validar campos obligatorios adicionales
    if (!this.nroChasis) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'El número de chasis es obligatorio',
        life: 3000
      });
      return;
    }

    if (!this.nroStock) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'El número de stock es obligatorio',
        life: 3000
      });
      return;
    }

    // Mapear equipamiento al formato de la API (SOLO codigo y valor)
    const equipamientoCompleto = [...this.equipamientoCol1, ...this.equipamientoCol2].map(item => ({
      codigo: item.codigo,
      valor: item.valor || 'NC' // Valor por defecto si no se seleccionó
    }));

    // Crear objeto según la interface ChecklistPDI de la API
    const checklist: ChecklistPDI = {
      Sucursal: this.form.get('sucursal')?.value,
      Almacen: this.form.get('almacen')?.value,
      Marca: this.form.get('marca')?.value,
      Modelo: this.form.get('modelo')?.value,
      Color: this.form.get('color')?.value || null,
      Kilometraje: this.kilometraje || '0',
      Nuevo: this.condicionNuevo,
      Activo: this.condicionActivo,
      NroChasis: this.nroChasis,
      NroStock: this.nroStock,
      Equipamiento: equipamientoCompleto,
      Transportista: this.transportista || '',
      Conductor: this.conductor || '',
      FechaLlegada: this.fechaLlegada,
      Observaciones: this.observaciones || '',
      NombreTecnico: this.nombreTecnico || '',
      FechaRecepcion: this.fechaRecepcion
    };


    // PASO 1: Guardar el checklist
    this.api.guardarChecklistPDI(checklist).subscribe({
      next: (response) => {
        
        this.messageService.add({
          severity: 'success',
          summary: 'Checklist guardado',
          detail: response?.message || 'El checklist se guardó correctamente',
          life: 3000
        });

        // PASO 2: Subir fotos si existen
        if (this.fotos.length > 0) {
          this.subirFotosSecuencial(this.nroStock);
        } else {
          this.limpiarFormulario();
        }
      },
      error: (error) => {
        console.error('❌ Error al guardar checklist:', error);
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: error?.error?.message || 'No se pudo guardar el checklist',
          life: 4000
        });
      }
    });
  }

  // Método para subir fotos de forma secuencial
  subirFotosSecuencial(stock: string): void {
    let fotosSubidas = 0;
    let erroresSubida = 0;
    const totalFotos = this.fotos.length;

    this.fotos.forEach((foto, index) => {
      if (!foto.file) {
        console.warn(`⚠️ Foto ${index + 1} no tiene archivo adjunto`);
        erroresSubida++;
        
        // Verificar si terminamos de procesar todas
        if (fotosSubidas + erroresSubida === totalFotos) {
          this.finalizarSubidaFotos(stock, fotosSubidas, erroresSubida);
        }
        return;
      }

      const tipoArchivo = foto.file.type.includes('pdf') ? 'pdf' : 'imagen';

      this.api.subirArchivoChecklist(stock, foto.file, tipoArchivo).subscribe({
        next: (response) => {
          fotosSubidas++;
          // Verificar si terminamos de subir todas
          if (fotosSubidas + erroresSubida === totalFotos) {
            this.finalizarSubidaFotos(stock, fotosSubidas, erroresSubida);
          }
        },
        error: (error) => {
          erroresSubida++;
          console.error(`❌ Error al subir foto ${index + 1}:`, error);

          // Verificar si terminamos de procesar todas
          if (fotosSubidas + erroresSubida === totalFotos) {
            this.finalizarSubidaFotos(stock, fotosSubidas, erroresSubida);
          }
        }
      });
    });
  }

  // Método para finalizar la subida de fotos
  finalizarSubidaFotos(stock: string, fotosSubidas: number, erroresSubida: number): void {

    // Mostrar mensaje de resultado
    if (erroresSubida === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Fotos subidas',
        detail: `${fotosSubidas} foto(s) subida(s) correctamente`,
        life: 3000
      });
    } else if (fotosSubidas === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al subir fotos',
        detail: 'No se pudieron subir las fotos',
        life: 4000
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Subida parcial',
        detail: `${fotosSubidas} subidas, ${erroresSubida} con error`,
        life: 4000
      });
    }

    // Limpiar formulario
    setTimeout(() => {
      this.limpiarFormulario();
    }, 2000);
  }

  limpiarFormulario(): void {
    this.form.reset();
    this.kilometraje = '';
    this.condicionNuevo = false;
    this.condicionActivo = false;
    this.nroChasis = '';
    this.nroStock = '';
    this.equipamientoCol1.forEach(item => item.valor = null);
    this.equipamientoCol2.forEach(item => item.valor = null);
    this.transportista = '';
    this.conductor = '';
    this.fechaLlegada = null;
    this.observaciones = '';
    this.nombreTecnico = '';
    this.fechaRecepcion = null;
    this.fotos = [];

    this.messageService.add({
      severity: 'info',
      summary: 'Formulario limpiado',
      detail: 'Todos los campos han sido reiniciados',
      life: 2000
    });
  }
}
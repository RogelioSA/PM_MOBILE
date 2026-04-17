// viaticos.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { StepperModule } from 'primeng/stepper';
import { Menu } from '../menu/menu';

interface SolicitudViatico {
  id: number;
  nombre: string;
  nivelJerarquico: string;
  motivoViatico: string;
  duracion: number;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'Borrador' | 'Aprobado';
  categorias: {
    hospedaje: number;
    alimentacion: number;
    movilidadInterna: number;
  };
  total: number;
  nota?: string;
  archivos?: number;
}

interface FlujoRevision {
  id: string;
  nombre: string;
  nivel: string;
}

interface FotoViatico {
  id: string;
  url: string;
  nombre: string;
  archivo?: File;
}

@Component({
  selector: 'app-viaticos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    InputNumberModule,
    ToastModule,
    TooltipModule,
    FileUploadModule,
    StepperModule,
    Menu
  ],
  templateUrl: './viaticos.html',
  styleUrl: './viaticos.css',
  providers: [MessageService]
})
export class Viaticos implements OnInit {
  solicitudes: SolicitudViatico[] = [];
  cargando = false;

  // Modal crear
  mostrarFormulario = false;
  pasoActual = 0;

  // Paso 1: Datos principales
  nombreViatico = '';
  nivelSeleccionado = '';
  notaOpcional = '';
  fotosAdjuntas: FotoViatico[] = [];

  // Paso 2: Motivo de viático
  motivoSeleccionado = '';
  fechaInicio = '';
  horaInicio = '18:00';
  fechaFin = '';
  horaFin = '18:00';
  duracionDias = 0;

  // Paso 3: Resumen y categorías
  categoriasCalculadas = {
    hospedaje: 0,
    alimentacion: 0,
    movilidadInterna: 0
  };
  totalCalculado = 0;

  // Modal enviar solicitud
  mostrarModalEnvio = false;
  flujoSeleccionado = '';
  solicitudParaEnviar: SolicitudViatico | null = null;

  // Opciones
  nivelesJerarquicos: any[] = [
    { label: 'Gerencias', value: 'Gerencias' },
    { label: 'Jefaturas', value: 'Jefaturas' },
    { label: 'Analistas', value: 'Analistas' }
  ];

  motivosViatico: any[] = [
    { label: 'Destino Internacional', value: 'Destino Internacional' },
    { label: 'Destino Nacional', value: 'Destino Nacional' },
    { label: 'Capacitación', value: 'Capacitación' },
    { label: 'Reunión de trabajo', value: 'Reunión de trabajo' }
  ];

  flujosRevision: FlujoRevision[] = [
    { 
      id: 'flujo1', 
      nombre: 'Cesar - Política - Gastos / Fondos / Viáticos',
      nivel: 'Primer aprobador: Cesar Helfer'
    },
    { 
      id: 'flujo2', 
      nombre: 'Gerencia - Finanzas - Aprobación Directa',
      nivel: 'Primer aprobador: Carlos Mendoza'
    }
  ];

  // Filtros
  busqueda = '';

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.cargarSolicitudesFicticias();
  }

  cargarSolicitudesFicticias() {
    this.solicitudes = [
      {
        id: 1,
        nombre: 'viaje a ica',
        nivelJerarquico: 'Gerencias',
        motivoViatico: 'Destino Internacional',
        duracion: 8,
        fechaInicio: new Date('2026-04-08T00:01:00'),
        fechaFin: new Date('2026-04-15T00:01:00'),
        estado: 'Borrador',
        categorias: {
          hospedaje: 637.50,
          alimentacion: 450.00,
          movilidadInterna: 187.50
        },
        total: 1275.00,
        nota: 'viaje comercial para visitar cliente x',
        archivos: 2
      },
      {
        id: 2,
        nombre: 'Viaje a trujillo',
        nivelJerarquico: 'Jefaturas',
        motivoViatico: 'Destino Nacional',
        duracion: 4,
        fechaInicio: new Date('2026-03-24T00:02:00'),
        fechaFin: new Date('2026-03-27T00:03:00'),
        estado: 'Borrador',
        categorias: {
          hospedaje: 450.00,
          alimentacion: 320.00,
          movilidadInterna: 358.75
        },
        total: 1128.75,
        nota: 'solicitud de viáticos para trujillo',
        archivos: 0
      },
      {
        id: 3,
        nombre: 'viaje a ica',
        nivelJerarquico: 'Jefaturas',
        motivoViatico: 'Destino Nacional',
        duracion: 7,
        fechaInicio: new Date('2026-03-18T00:03:00'),
        fechaFin: new Date('2026-03-24T00:03:00'),
        estado: 'Aprobado',
        categorias: {
          hospedaje: 787.50,
          alimentacion: 560.00,
          movilidadInterna: 748.75
        },
        total: 2096.25,
        nota: 'viaje comercial ica cliente x',
        archivos: 0
      }
    ];
  }

  // GETTER para flujo seleccionado
  get flujoActual(): FlujoRevision | undefined {
    return this.flujosRevision.find(f => f.id === this.flujoSeleccionado);
  }

  nuevaSolicitud() {
    this.limpiarFormulario();
    this.pasoActual = 0;
    this.mostrarFormulario = true;
  }

  limpiarFormulario() {
    this.nombreViatico = '';
    this.nivelSeleccionado = '';
    this.notaOpcional = '';
    this.fotosAdjuntas = [];
    this.motivoSeleccionado = '';
    this.fechaInicio = '';
    this.horaInicio = '18:00';
    this.fechaFin = '';
    this.horaFin = '18:00';
    this.duracionDias = 0;
    this.categoriasCalculadas = {
      hospedaje: 0,
      alimentacion: 0,
      movilidadInterna: 0
    };
    this.totalCalculado = 0;
  }

  // Manejo de fotos
  onFileSelect(event: any) {
    const files = event.files;
    
    if (!files || files.length === 0) {
      return;
    }

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotosAdjuntas.push({
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

  eliminarFoto(foto: FotoViatico) {
    this.fotosAdjuntas = this.fotosAdjuntas.filter(f => f.id !== foto.id);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Foto eliminada',
      detail: 'La foto ha sido eliminada',
      life: 2000
    });
  }

  siguiente() {
    if (this.pasoActual === 0) {
      if (!this.nombreViatico.trim() || !this.nivelSeleccionado) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Datos incompletos',
          detail: 'Complete el nombre y nivel jerárquico',
          life: 3000
        });
        return;
      }
    }

    if (this.pasoActual === 1) {
      if (!this.motivoSeleccionado || !this.fechaInicio || !this.fechaFin) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Datos incompletos',
          detail: 'Complete motivo, fecha inicio y fecha fin',
          life: 3000
        });
        return;
      }
      this.calcularDuracionYCategorias();
    }

    this.pasoActual++;
  }

  volver() {
    this.pasoActual--;
  }

  calcularDuracionYCategorias() {
    const inicio = new Date(`${this.fechaInicio}T${this.horaInicio}`);
    const fin = new Date(`${this.fechaFin}T${this.horaFin}`);
    
    const diffMs = fin.getTime() - inicio.getTime();
    this.duracionDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Tarifas base por día (ficticias)
    const tarifaPorDia = {
      hospedaje: 79.69,
      alimentacion: 56.25,
      movilidadInterna: 23.44
    };

    this.categoriasCalculadas.hospedaje = this.duracionDias * tarifaPorDia.hospedaje;
    this.categoriasCalculadas.alimentacion = this.duracionDias * tarifaPorDia.alimentacion;
    this.categoriasCalculadas.movilidadInterna = this.duracionDias * tarifaPorDia.movilidadInterna;

    this.totalCalculado = 
      this.categoriasCalculadas.hospedaje + 
      this.categoriasCalculadas.alimentacion + 
      this.categoriasCalculadas.movilidadInterna;
  }

  // CREAR SOLICITUD: Agrega directamente a la lista como Borrador
  crearSolicitud() {
    const nuevaSolicitud: SolicitudViatico = {
      id: this.solicitudes.length + 1,
      nombre: this.nombreViatico,
      nivelJerarquico: this.nivelSeleccionado,
      motivoViatico: this.motivoSeleccionado,
      duracion: this.duracionDias,
      fechaInicio: new Date(`${this.fechaInicio}T${this.horaInicio}`),
      fechaFin: new Date(`${this.fechaFin}T${this.horaFin}`),
      estado: 'Borrador',
      categorias: { ...this.categoriasCalculadas },
      total: this.totalCalculado,
      nota: this.notaOpcional,
      archivos: this.fotosAdjuntas.length
    };

    this.solicitudes.unshift(nuevaSolicitud);

    this.messageService.add({
      severity: 'success',
      summary: 'Solicitud creada',
      detail: `Solicitud de viático "${this.nombreViatico}" creada como borrador`,
      life: 3000
    });

    this.mostrarFormulario = false;
    this.limpiarFormulario();
  }

  // ENVIAR SOLICITUD: Desde el card, abre modal de flujo
  abrirModalEnvio(solicitud: SolicitudViatico) {
    this.solicitudParaEnviar = solicitud;
    this.flujoSeleccionado = '';
    this.mostrarModalEnvio = true;
  }

  // CONFIRMAR ENVÍO: Cambia estado a Aprobado
  enviarSolicitud() {
    if (!this.flujoSeleccionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Flujo requerido',
        detail: 'Seleccione un flujo de revisión',
        life: 3000
      });
      return;
    }

    if (this.solicitudParaEnviar) {
      this.solicitudParaEnviar.estado = 'Aprobado';

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud enviada',
        detail: `Solicitud "${this.solicitudParaEnviar.nombre}" enviada para aprobación`,
        life: 3000
      });
    }

    this.cerrarModalEnvio();
  }

  cerrarModalEnvio() {
    this.mostrarModalEnvio = false;
    this.flujoSeleccionado = '';
    this.solicitudParaEnviar = null;
  }

  editarSolicitud(solicitud: SolicitudViatico) {
    console.log('Editar solicitud:', solicitud);
    this.messageService.add({
      severity: 'info',
      summary: 'Función en desarrollo',
      detail: 'La edición de solicitudes estará disponible pronto',
      life: 3000
    });
  }

  verSolicitud(solicitud: SolicitudViatico) {
    console.log('Ver solicitud:', solicitud);
    this.messageService.add({
      severity: 'info',
      summary: 'Función en desarrollo',
      detail: 'El detalle completo estará disponible pronto',
      life: 3000
    });
  }

  get solicitudesFiltradas(): SolicitudViatico[] {
    if (!this.busqueda.trim()) {
      return this.solicitudes;
    }
    const term = this.busqueda.toLowerCase();
    return this.solicitudes.filter(s => 
      s.nombre.toLowerCase().includes(term) ||
      s.motivoViatico.toLowerCase().includes(term) ||
      s.nivelJerarquico.toLowerCase().includes(term)
    );
  }
}
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Menu } from '../menu/menu';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { Api } from '../services/api';
import { Master } from '../services/master'; // Importar Master

interface Opcion {
  label: string;
  value: string;
}

interface Vehiculo {
  vin: string;
  stock: string;
  modelo: string;
  color: string;
  cantidad: number;
}

@Component({
  selector: 'app-salida-trabajo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Menu,
    SelectModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TableModule,
    DatePickerModule,
    CheckboxModule,
    ZXingScannerModule
  ],
  providers: [MessageService],
  templateUrl: './salida-trabajo.html',
  styleUrl: './salida-trabajo.css'
})
export class SalidaTrabajo implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('vinInputElement') vinInputElement!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  sucursales: Opcion[] = [];
  almacenes: Opcion[] = [];
  ordenesTrabajo: Opcion[] = [];

  // Modal Scanner
  modalVisible = false;
  vinInput = '';
  cantidad = 1;
  scannerActivo = false;

  // ZXing Scanner
  availableDevices: MediaDeviceInfo[] = [];
  currentDevice: MediaDeviceInfo | undefined;
  hasDevices = false;
  hasPermission = false;

  // Solo QR Code
  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.QR_CODE
  ];

  // Tabla de vehículos
  vehiculos: Vehiculo[] = [];

  // Fecha y documento
  fechaSeleccionada: Date = new Date();
  documentoGenerado = '';

  // Control de escaneo
  private ultimoCodigoEscaneado = '';
  private ultimoTiempoEscaneo = 0;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private api: Api,
    private master: Master // Inyectar Master
  ) {
    console.log('🏗️ Constructor: Componente inicializado');
  }

  ngOnInit() {
    console.log('🚀 ngOnInit: Iniciando componente');

    this.form = this.fb.group({
      sucursal: [null, Validators.required],
      almacen: [null, Validators.required],
      ordenTrabajo: [null, Validators.required]
    });

    console.log('📋 Formatos QR habilitados:', this.formatsEnabled);

    this.cargarSucursales();

    this.form.get('sucursal')?.valueChanges.subscribe(idSucursal => {
      if (idSucursal) {
        this.cargarAlmacenesPorSucursal(idSucursal);
      } else {
        this.almacenes = [];
        this.form.get('almacen')?.reset();
      }
    });

    this.cargarOrdenesTrabajo();

    // Solicitar permisos al iniciar
    console.log('🎥 Solicitando permisos de cámara al inicio...');
    this.solicitarPermisoCamara();
  }

  ngAfterViewInit() {
    if (this.modalVisible && this.vinInputElement) {
      setTimeout(() => {
        this.vinInputElement.nativeElement.focus();
      }, 100);
    }
  }

  async solicitarPermisoCamara() {
    console.log('📸 [PERMISO] Iniciando solicitud de permiso de cámara...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ [PERMISO] getUserMedia no disponible en este navegador');
        this.messageService.add({
          severity: 'error',
          summary: 'Navegador no compatible',
          detail: 'Este navegador no soporta acceso a la cámara',
          life: 4000
        });
        return;
      }

      console.log('🔍 [PERMISO] Enumerando dispositivos disponibles...');

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      console.log('📹 [PERMISO] Dispositivos de video encontrados:', videoDevices.length);
      videoDevices.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.label || 'Cámara sin nombre'} (${device.deviceId})`);
      });

      if (videoDevices.length === 0) {
        console.error('❌ [PERMISO] No se encontraron cámaras');
        this.messageService.add({
          severity: 'error',
          summary: 'Sin cámaras',
          detail: 'No se detectaron cámaras en el dispositivo',
          life: 4000
        });
        return;
      }

      console.log('🎬 [PERMISO] Solicitando acceso a la cámara...');
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      console.log('⚙️ [PERMISO] Constraints:', JSON.stringify(constraints, null, 2));

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ [PERMISO] Stream obtenido:', stream);
      console.log('🎥 [PERMISO] Tracks activos:', stream.getTracks().length);

      stream.getTracks().forEach((track, index) => {
        console.log(`  Track ${index + 1}:`, {
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });

      stream.getTracks().forEach(track => {
        console.log(`🛑 [PERMISO] Deteniendo track: ${track.label}`);
        track.stop();
      });

      this.hasPermission = true;
      console.log('✅ [PERMISO] Permiso de cámara otorgado exitosamente');

      this.messageService.add({
        severity: 'success',
        summary: 'Permiso otorgado',
        detail: 'Cámara lista para escanear',
        life: 2000
      });

    } catch (error: any) {
      console.error('❌ [PERMISO] Error al solicitar permiso:', error);
      console.error('📋 [PERMISO] Tipo de error:', error.name);
      console.error('💬 [PERMISO] Mensaje:', error.message);

      this.hasPermission = false;

      let detalleError = 'No se pudo acceder a la cámara';

      if (error.name === 'NotAllowedError') {
        detalleError = 'Permiso denegado por el usuario';
        console.error('🚫 [PERMISO] Usuario denegó el acceso a la cámara');
      } else if (error.name === 'NotFoundError') {
        detalleError = 'No se encontró ninguna cámara';
        console.error('🔍 [PERMISO] No hay cámaras disponibles');
      } else if (error.name === 'NotReadableError') {
        detalleError = 'Cámara en uso por otra aplicación';
        console.error('🔒 [PERMISO] Cámara bloqueada o en uso');
      } else if (error.name === 'OverconstrainedError') {
        detalleError = 'Configuración de cámara no soportada';
        console.error('⚠️ [PERMISO] Constraints no compatibles');
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error de cámara',
        detail: detalleError,
        life: 4000
      });
    }
  }

  onModalShow() {
    console.log('🎭 [MODAL] Modal abierto');
    console.log('🔓 [MODAL] Estado permiso:', this.hasPermission);

    this.scannerActivo = true;
    console.log('✅ [MODAL] Scanner activado');

    if (!this.hasPermission) {
      console.log('⚠️ [MODAL] No hay permiso, solicitando...');
      this.solicitarPermisoCamara();
    } else {
      console.log('✅ [MODAL] Permiso ya otorgado, listo para escanear');
    }

    setTimeout(() => {
      if (this.vinInputElement) {
        this.vinInputElement.nativeElement.focus();
        console.log('⌨️ [MODAL] Focus en input VIN');
      }
    }, 200);
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    console.log('📷 [SCANNER] ========== CÁMARAS ENCONTRADAS ==========');
    console.log('🔢 [SCANNER] Total de cámaras:', devices.length);

    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);

    devices.forEach((device, index) => {
      console.log(`📹 [SCANNER] Cámara ${index + 1}:`, {
        deviceId: device.deviceId,
        label: device.label || 'Sin nombre',
        kind: device.kind,
        groupId: device.groupId
      });
    });

    const rearCamera = devices.find(d =>
      /back|rear|environment|trasera/gi.test(d.label)
    );

    this.currentDevice = rearCamera || devices[0];

    if (rearCamera) {
      console.log('✅ [SCANNER] Cámara trasera detectada y seleccionada:', rearCamera.label);
    } else {
      console.log('⚠️ [SCANNER] No se encontró cámara trasera, usando primera disponible:', devices[0]?.label);
    }

    console.log('🎯 [SCANNER] Cámara activa:', {
      deviceId: this.currentDevice?.deviceId,
      label: this.currentDevice?.label || 'Sin nombre'
    });

    console.log('📋 [SCANNER] Formatos habilitados:', this.formatsEnabled.map(f => BarcodeFormat[f]));
    console.log('⚙️ [SCANNER] Configuración scanner:', {
      tryHarder: true,
      timeBetweenScans: 500,
      delayBetweenScanSuccess: 500
    });

    console.log('🟢 [SCANNER] Scanner listo para detectar códigos QR');
  }

  onCodeResult(resultString: string) {
    const ahora = Date.now();

    console.log('🎯 [DETECCIÓN] ========== CÓDIGO DETECTADO ==========');
    console.log('📝 [DETECCIÓN] Código (raw):', resultString);
    console.log('📏 [DETECCIÓN] Longitud:', resultString?.length);
    console.log('🔤 [DETECCIÓN] Tipo:', typeof resultString);
    console.log('⏱️ [DETECCIÓN] Timestamp:', new Date().toISOString());

    if (this.ultimoCodigoEscaneado === resultString &&
      (ahora - this.ultimoTiempoEscaneo) < 1000) {
      console.log('⏭️ [DETECCIÓN] Código duplicado ignorado (escaneado hace',
        (ahora - this.ultimoTiempoEscaneo), 'ms)');
      return;
    }

    if (!resultString) {
      console.warn('⚠️ [DETECCIÓN] Código vacío o null, ignorando');
      return;
    }

    const codigoLimpio = resultString.trim();
    console.log('🧹 [DETECCIÓN] Código limpio:', codigoLimpio);

    if (codigoLimpio.length < 5) {
      console.warn('⚠️ [DETECCIÓN] Código muy corto (<5 caracteres), ignorando:', codigoLimpio);
      console.warn('📊 [DETECCIÓN] Longitud:', codigoLimpio.length);
      return;
    }

    console.log('✅ [DETECCIÓN] ¡CÓDIGO QR VÁLIDO ACEPTADO!');
    console.log('💾 [DETECCIÓN] Guardando en input VIN...');

    this.vinInput = codigoLimpio;
    this.ultimoCodigoEscaneado = codigoLimpio;
    this.ultimoTiempoEscaneo = ahora;

    console.log('🎉 [DETECCIÓN] vinInput actualizado:', this.vinInput);

    this.messageService.add({
      severity: 'success',
      summary: 'QR escaneado',
      detail: `Código: ${codigoLimpio.substring(0, 20)}${codigoLimpio.length > 20 ? '...' : ''}`,
      life: 2000
    });

    console.log('🔔 [DETECCIÓN] Notificación mostrada al usuario');

    setTimeout(() => {
      if (this.vinInputElement) {
        this.vinInputElement.nativeElement.focus();
        console.log('⌨️ [DETECCIÓN] Focus restaurado en input');
      }
    }, 100);

    console.log('✅ [DETECCIÓN] Proceso completado exitosamente');
  }

  onHasPermission(has: boolean) {
    console.log('🔐 [PERMISO] Callback onHasPermission:', has);
    this.hasPermission = has;

    if (has) {
      console.log('✅ [PERMISO] Permiso confirmado por ZXing scanner');
    } else {
      console.error('❌ [PERMISO] Permiso denegado o no disponible');
      this.messageService.add({
        severity: 'error',
        summary: 'Permiso denegado',
        detail: 'Se requiere acceso a la cámara para escanear',
        life: 3000
      });
    }
  }

  onScanError(error: any) {
    const erroresIgnorados = [
      'No MultiFormat Readers',
      'NotFoundException',
      'No barcode found'
    ];

    const esErrorIgnorado = erroresIgnorados.some(msg =>
      error?.message?.includes(msg) || error?.name?.includes(msg)
    );

    if (esErrorIgnorado) {
      return;
    }

    console.warn('⚠️ [ERROR] Error durante escaneo:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
  }

  // Llamadas a Master Service
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

  cargarOrdenesTrabajo() {
    const idTaller = '001';
    this.ordenesTrabajo = [];
    this.form.get('ordenTrabajo')?.reset();

    this.master.getOrdenesProduccionPorSucursal(idTaller).subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.ordenesTrabajo = response.data.map((item: any) => ({
            label: item.idOrdenPro,
            value: item.idOrdenPro
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar órdenes de trabajo', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las órdenes de trabajo',
          life: 3000
        });
      }
    });
  }

  onScanner() {
    console.log('📱 [ACCIÓN] Botón Scanner presionado');
    console.log('📋 [ACCIÓN] Formatos habilitados:', this.formatsEnabled.map(f => BarcodeFormat[f]));

    if (this.form.invalid) {
      console.warn('⚠️ [ACCIÓN] Formulario inválido');
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Debe seleccionar Sucursal, Almacén y Orden de Trabajo',
        life: 3000
      });
      return;
    }

    console.log('✅ [ACCIÓN] Formulario válido, abriendo modal...');
    this.modalVisible = true;
  }

  cerrarModal() {
    console.log('🔒 [MODAL] Cerrando modal');
    this.modalVisible = false;
    this.scannerActivo = false;
    console.log('🛑 [MODAL] Scanner desactivado');
  }

  agregarVehiculo() {
    const vin = this.vinInput.trim();

    console.log('➕ [AGREGAR] Intentando agregar vehículo');
    console.log('🔑 [AGREGAR] VIN:', vin);

    if (!vin) {
      console.warn('⚠️ [AGREGAR] VIN vacío');
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo vacío',
        detail: 'Debe ingresar un VIN',
        life: 2000
      });
      return;
    }

    if (this.vehiculos.some(v => v.vin === vin)) {
      console.warn('⚠️ [AGREGAR] VIN duplicado:', vin);
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicado',
        detail: 'Este VIN ya fue agregado',
        life: 2000
      });
      return;
    }

    console.log('🔍 [AGREGAR] Consultando información del vehículo...');

    this.master.getCarPorVin(vin).subscribe({
      next: (data) => {
        console.log('📦 [AGREGAR] Respuesta del servidor:', data);

        if (!data || !data.vin) {
          console.warn('⚠️ [AGREGAR] No se encontró información del vehículo');
          this.messageService.add({
            severity: 'warn',
            summary: 'No encontrado',
            detail: 'No se encontró información del vehículo',
            life: 3000
          });
          return;
        }

        const nuevoVehiculo: Vehiculo = {
          vin: data.vin,
          stock: data.placa,
          modelo: data.modelo,
          color: data.color,
          cantidad: this.cantidad
        };

        console.log('✅ [AGREGAR] Vehículo creado:', nuevoVehiculo);

        this.vehiculos.push(nuevoVehiculo);
        console.log('📊 [AGREGAR] Total vehículos:', this.vehiculos.length);

        this.vinInput = '';
        this.cantidad = 1;

        console.log('🧹 [AGREGAR] Formulario limpiado');

        this.messageService.add({
          severity: 'success',
          summary: 'Vehículo agregado',
          detail: `VIN ${data.vin} agregado correctamente`,
          life: 2000
        });

        setTimeout(() => {
          this.vinInputElement?.nativeElement.focus();
        }, 100);
      },
      error: (err) => {
        console.error('❌ [AGREGAR] Error al consultar vehículo:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al consultar el vehículo',
          life: 3000
        });
      }
    });
  }

  reiniciar() {
    console.log('🔄 [RESET] Reiniciando formulario');
    this.vehiculos = [];
    this.vinInput = '';
    this.cantidad = 1;
    this.fechaSeleccionada = new Date();
    this.documentoGenerado = '';
    console.log('✅ [RESET] Formulario reiniciado');

    setTimeout(() => {
      if (this.vinInputElement) {
        this.vinInputElement.nativeElement.focus();
      }
    }, 100);
  }

  nuevoScaneo() {
    console.log('🔄 [NUEVO] Iniciando nuevo escaneo');
    this.scannerActivo = false;

    setTimeout(() => {
      this.modalVisible = true;
      this.scannerActivo = true;
      console.log('✅ [NUEVO] Scanner reiniciado');

      setTimeout(() => {
        if (this.vinInputElement) {
          this.vinInputElement.nativeElement.focus();
        }
      }, 200);
    }, 100);
  }

  // Llamada a Api Service
  guardar() {
    console.log('💾 [GUARDAR] Iniciando guardado');

    if (this.vehiculos.length === 0) {
      console.warn('⚠️ [GUARDAR] No hay vehículos para guardar');
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin vehículos',
        detail: 'Debe agregar al menos un vehículo',
        life: 3000
      });
      return;
    }

    const idsucursal = this.form.get('sucursal')?.value;
    const idalmacen = this.form.get('almacen')?.value;
    const idordentrabajo = this.form.get('ordenTrabajo')?.value;

    console.log('📋 [GUARDAR] Datos del formulario:', {
      sucursal: idsucursal,
      almacen: idalmacen,
      ordenTrabajo: idordentrabajo,
      cantidadVehiculos: this.vehiculos.length
    });

    if (!idsucursal || !idalmacen || !idordentrabajo) {
      console.error('❌ [GUARDAR] Datos incompletos');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Datos incompletos del formulario',
        life: 3000
      });
      return;
    }

    const fecha = this.fechaSeleccionada.toISOString().split('T')[0];

    const detalle = this.vehiculos.map(v => ({
      idproducto: v.vin,
      cantidad: v.cantidad
    }));

    console.log('📦 [GUARDAR] Detalle a enviar:', detalle);

    this.api.registroSalidaOT(idsucursal, idalmacen, idordentrabajo, fecha, detalle).subscribe({
      next: (response) => {
        console.log('✅ [GUARDAR] Respuesta exitosa:', response);
        this.documentoGenerado = response?.documento || 'DOC-' + Date.now();

        this.messageService.add({
          severity: 'success',
          summary: 'Guardado exitoso',
          detail: `Documento ${this.documentoGenerado} generado`,
          life: 3000
        });

        this.cerrarModal();
      },
      error: (error) => {
        console.error('❌ [GUARDAR] Error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: error?.error?.message || 'No se pudo registrar la salida',
          life: 4000
        });
      }
    });
  }

  ngOnDestroy() {
    console.log('🧹 [DESTROY] Limpiando componente');
    this.scannerActivo = false;
  }
}
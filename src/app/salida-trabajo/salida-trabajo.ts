import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, Renderer2 } from '@angular/core';
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
import { DatePicker } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { Api } from '../services/api';
import { Master } from '../services/master';

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
  @ViewChild('idProductoInputElement') idProductoInputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('calendarioPicker') calendarioPicker!: DatePicker;

  form!: FormGroup;
  sucursales: Opcion[] = [];
  almacenes: Opcion[] = [];
  ordenesTrabajo: Opcion[] = [];

  placaSeleccionada = '';
  idProductoSeleccionado = '';

  // Modal Scanner
  modalVisible = false;
  idProductoInput = '';
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
    private master: Master,
    private renderer: Renderer2
  ) {
  }

  ngOnInit() {
    this.form = this.fb.group({
      sucursal: [null, Validators.required],
      almacen: [null, Validators.required],
      ordenTrabajo: [null, Validators.required]
    });

    this.cargarSucursales();

    this.form.get('sucursal')?.valueChanges.subscribe(idSucursal => {
      if (idSucursal) {
        this.cargarAlmacenesPorSucursal(idSucursal);
      } else {
        this.almacenes = [];
        this.form.get('almacen')?.reset();
      }
    });

    this.form.get('ordenTrabajo')?.valueChanges.subscribe(idOrdenTrabajo => {
      if (idOrdenTrabajo) {
        this.cargarDetalleOrdenTrabajo(idOrdenTrabajo);
      } else {
        this.placaSeleccionada = '';
        this.idProductoSeleccionado = '';
      }
    });

    this.cargarOrdenesTrabajo();
    this.solicitarPermisoCamara();
  }

  ngAfterViewInit() {
    if (this.modalVisible && this.idProductoInputElement) {
      setTimeout(() => {
        this.idProductoInputElement.nativeElement.focus();
      }, 100);
    }

    // Configurar listener para el calendario
    this.setupCalendarioListener();
  }

  setupCalendarioListener() {
    // Escuchar cuando se abra cualquier datepicker
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.classList.contains('p-datepicker')) {
            this.ajustarPosicionCalendario(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: false
    });
  }

  ajustarPosicionCalendario(calendario: HTMLElement) {
    console.log('📅 [CALENDARIO] Ajustando posición');

    // Esperar un frame para que PrimeNG termine de posicionar
    requestAnimationFrame(() => {
      const inputElement = document.querySelector('.fecha-input input') as HTMLElement;
      
      if (!inputElement) {
        console.warn('⚠️ [CALENDARIO] No se encontró el input');
        return;
      }

      const inputRect = inputElement.getBoundingClientRect();
      const calendarHeight = calendario.offsetHeight;
      const viewportHeight = window.innerHeight;

      // Calcular espacio disponible arriba y abajo
      const espacioArriba = inputRect.top;
      const espacioAbajo = viewportHeight - inputRect.bottom;

      console.log('📐 [CALENDARIO] Espacios:', {
        arriba: espacioArriba,
        abajo: espacioAbajo,
        alturaCalendario: calendarHeight
      });

      // Forzar posición arriba SIEMPRE que haya espacio
      if (espacioArriba > calendarHeight + 10) {
        const topPosition = inputRect.top - calendarHeight - 8;
        
        this.renderer.setStyle(calendario, 'position', 'fixed');
        this.renderer.setStyle(calendario, 'top', `${topPosition}px`);
        this.renderer.setStyle(calendario, 'left', `${inputRect.left}px`);
        this.renderer.setStyle(calendario, 'bottom', 'auto');
        this.renderer.setStyle(calendario, 'transform', 'none');
        
        console.log('✅ [CALENDARIO] Posicionado arriba en:', topPosition);
      } else {
        // Si no hay espacio arriba, posicionar arriba del viewport
        this.renderer.setStyle(calendario, 'position', 'fixed');
        this.renderer.setStyle(calendario, 'top', '10px');
        this.renderer.setStyle(calendario, 'left', `${inputRect.left}px`);
        this.renderer.setStyle(calendario, 'bottom', 'auto');
        
        console.log('⚠️ [CALENDARIO] Poco espacio, posicionado en top: 10px');
      }
    });
  }

  async solicitarPermisoCamara() {
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

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

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

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
        track.stop();
      });

      this.hasPermission = true;

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
    this.scannerActivo = true;

    if (!this.hasPermission) {
      this.solicitarPermisoCamara();
    } else {
      console.log('✅ [MODAL] Permiso ya otorgado, listo para escanear');
    }

    setTimeout(() => {
      if (this.idProductoInputElement) {
        this.idProductoInputElement.nativeElement.focus();
      }
    }, 200);
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
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
      timeBetweenScans: 300,
      delayBetweenScanSuccess: 300
    });

    console.log('🟢 [SCANNER] Scanner listo para detectar códigos QR');
  }

  onCodeResult(resultString: string) {
    const ahora = Date.now();

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

    this.idProductoInput = codigoLimpio;
    this.ultimoCodigoEscaneado = codigoLimpio;
    this.ultimoTiempoEscaneo = ahora;

    console.log('🎉 [DETECCIÓN] idProductoInput actualizado:', this.idProductoInput);

    this.messageService.add({
      severity: 'success',
      summary: 'QR escaneado',
      detail: `Código: ${codigoLimpio.substring(0, 20)}${codigoLimpio.length > 20 ? '...' : ''}`,
      life: 2000
    });

    console.log('🔔 [DETECCIÓN] Notificación mostrada al usuario');

    setTimeout(() => {
      if (this.idProductoInputElement) {
        this.idProductoInputElement.nativeElement.focus();
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
            label: `OTR${item.serie} - ${item.numero}`,
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

  cargarDetalleOrdenTrabajo(idOrdenTrabajo: string) {
    console.log('📋 [DETALLE OT] Cargando detalle para:', idOrdenTrabajo);
    
    const idTaller = '001';
    
    this.master.getOrdenesProduccionPorSucursal(idTaller).subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          const ordenSeleccionada = response.data.find(
            (item: any) => item.idOrdenPro === idOrdenTrabajo
          );

          if (ordenSeleccionada) {
            this.placaSeleccionada = ordenSeleccionada.idOrdenProduc || '';
            this.idProductoSeleccionado = ordenSeleccionada.idProducto || '';

            console.log('✅ [DETALLE OT] Datos cargados:', {
              placa: this.placaSeleccionada,
              idProducto: this.idProductoSeleccionado
            });
          } else {
            console.warn('⚠️ [DETALLE OT] No se encontró la orden seleccionada');
            this.placaSeleccionada = '';
            this.idProductoSeleccionado = '';
          }
        }
      },
      error: (error) => {
        console.error('❌ [DETALLE OT] Error al cargar detalle:', error);
        this.placaSeleccionada = '';
        this.idProductoSeleccionado = '';
      }
    });
  }
  
  onScanner() {
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

    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.scannerActivo = false;
  }

  agregarVehiculo() {
    const idProducto = this.idProductoInput.trim();

    if (!idProducto) {
      console.warn('⚠️ [AGREGAR] idProducto vacío');
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo vacío',
        detail: 'Debe ingresar un idProducto',
        life: 2000
      });
      return;
    }

    if (this.vehiculos.some(v => v.vin === idProducto)) {
      console.warn('⚠️ [AGREGAR] idProducto duplicado:', idProducto);
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicado',
        detail: 'Este idProducto ya fue agregado',
        life: 2000
      });
      return;
    }

    this.master.getCarPorVin(idProducto).subscribe({
      next: (data) => {
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

        this.vehiculos.push(nuevoVehiculo);

        this.idProductoInput = '';
        this.cantidad = 1;

        this.messageService.add({
          severity: 'success',
          summary: 'Vehículo agregado',
          detail: `idProducto ${data.vin} agregado correctamente`,
          life: 2000
        });

        setTimeout(() => {
          this.idProductoInputElement?.nativeElement.focus();
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
    this.vehiculos = [];
    this.idProductoInput = '';
    this.cantidad = 1;
    this.fechaSeleccionada = new Date();
    this.documentoGenerado = '';

    setTimeout(() => {
      if (this.idProductoInputElement) {
        this.idProductoInputElement.nativeElement.focus();
      }
    }, 100);
  }

  nuevoScaneo() {
    this.scannerActivo = false;

    setTimeout(() => {
      this.modalVisible = true;
      this.scannerActivo = true;

      setTimeout(() => {
        if (this.idProductoInputElement) {
          this.idProductoInputElement.nativeElement.focus();
        }
      }, 200);
    }, 100);
  }

  guardar() {
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

    this.api.registroSalidaOT(idsucursal, idalmacen, idordentrabajo, fecha, detalle).subscribe({
      next: (response) => {
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
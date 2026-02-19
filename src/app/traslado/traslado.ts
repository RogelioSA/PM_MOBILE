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
  idProducto: string;
  nombre: string;
  idMedida: string;
  cantidad: number;
}

@Component({
  selector: 'app-traslado',
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
  templateUrl: './traslado.html',
  styleUrl: './traslado.css'
})
export class Traslado implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('idProductoInputElement') idProductoInputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('calendarioPicker') calendarioPicker!: DatePicker;

  form!: FormGroup;
  sucursales: Opcion[] = [];
  almacenesOrigen: Opcion[] = [];
  almacenesDestino: Opcion[] = [];

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

  // Tabla de productos
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
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      sucursalOrigen: [null, Validators.required],
      almacenOrigen: [null, Validators.required],
      sucursalDestino: [null, Validators.required],
      almacenDestino: [null, Validators.required]
    });

    this.cargarSucursales();

    this.form.get('sucursalOrigen')?.valueChanges.subscribe(idSucursal => {
      if (idSucursal) {
        this.cargarAlmacenesOrigen(idSucursal);
      } else {
        this.almacenesOrigen = [];
        this.form.get('almacenOrigen')?.reset();
      }
    });

    this.form.get('sucursalDestino')?.valueChanges.subscribe(idSucursal => {
      if (idSucursal) {
        this.cargarAlmacenesDestino(idSucursal);
      } else {
        this.almacenesDestino = [];
        this.form.get('almacenDestino')?.reset();
      }
    });

    this.solicitarPermisoCamara();
  }

  ngAfterViewInit() {
    if (this.modalVisible && this.idProductoInputElement) {
      setTimeout(() => {
        this.idProductoInputElement.nativeElement.focus();
      }, 100);
    }

    this.setupCalendarioListener();
    this.preventSelectAutoFocus();
  }

  private preventSelectAutoFocus() {
    // Interceptar eventos de focus en los p-select
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const isSelectTrigger = target.closest('.p-select') || target.closest('p-select');
      
      if (isSelectTrigger) {
        setTimeout(() => {
          const filterInput = document.querySelector('.p-select-filter') as HTMLInputElement;
          if (filterInput) {
            filterInput.blur();
          }
        }, 10);
      }
    });
  }
  setupCalendarioListener() {
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
    requestAnimationFrame(() => {
      const inputElement = document.querySelector('.fecha-input input') as HTMLElement;

      if (!inputElement) return;

      const inputRect = inputElement.getBoundingClientRect();
      const calendarHeight = calendario.offsetHeight;
      const espacioArriba = inputRect.top;

      if (espacioArriba > calendarHeight + 10) {
        const topPosition = inputRect.top - calendarHeight - 8;
        this.renderer.setStyle(calendario, 'position', 'fixed');
        this.renderer.setStyle(calendario, 'top', `${topPosition}px`);
        this.renderer.setStyle(calendario, 'left', `${inputRect.left}px`);
        this.renderer.setStyle(calendario, 'bottom', 'auto');
        this.renderer.setStyle(calendario, 'transform', 'none');
      } else {
        this.renderer.setStyle(calendario, 'position', 'fixed');
        this.renderer.setStyle(calendario, 'top', '10px');
        this.renderer.setStyle(calendario, 'left', `${inputRect.left}px`);
        this.renderer.setStyle(calendario, 'bottom', 'auto');
      }
    });
  }

  async solicitarPermisoCamara() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

      if (videoDevices.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Sin cámaras',
          detail: 'No se detectaron cámaras en el dispositivo',
          life: 4000
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      stream.getTracks().forEach(track => track.stop());
      this.hasPermission = true;

      this.messageService.add({
        severity: 'success',
        summary: 'Permiso otorgado',
        detail: 'Cámara lista para escanear',
        life: 2000
      });

    } catch (error: any) {
      this.hasPermission = false;

      let detalleError = 'No se pudo acceder a la cámara';
      if (error.name === 'NotAllowedError') detalleError = 'Permiso denegado por el usuario';
      else if (error.name === 'NotFoundError') detalleError = 'No se encontró ninguna cámara';
      else if (error.name === 'NotReadableError') detalleError = 'Cámara en uso por otra aplicación';
      else if (error.name === 'OverconstrainedError') detalleError = 'Configuración de cámara no soportada';

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

    const rearCamera = devices.find(d =>
      /back|rear|environment|trasera/gi.test(d.label)
    );

    this.currentDevice = rearCamera || devices[0];
  }

  onCodeResult(resultString: string) {
    const ahora = Date.now();

    if (
      this.ultimoCodigoEscaneado === resultString &&
      (ahora - this.ultimoTiempoEscaneo) < 1000
    ) return;

    if (!resultString) return;

    const codigoLimpio = resultString.trim();

    if (codigoLimpio.length < 5) return;

    this.idProductoInput = codigoLimpio;
    this.ultimoCodigoEscaneado = codigoLimpio;
    this.ultimoTiempoEscaneo = ahora;

    this.messageService.add({
      severity: 'success',
      summary: 'QR escaneado',
      detail: `Código: ${codigoLimpio.substring(0, 20)}${codigoLimpio.length > 20 ? '...' : ''}`,
      life: 2000
    });

    setTimeout(() => {
      if (this.idProductoInputElement) {
        this.idProductoInputElement.nativeElement.focus();
      }
    }, 100);
  }

  onHasPermission(has: boolean) {
    this.hasPermission = has;

    if (!has) {
      this.messageService.add({
        severity: 'error',
        summary: 'Permiso denegado',
        detail: 'Se requiere acceso a la cámara para escanear',
        life: 3000
      });
    }
  }

  onScanError(error: any) {
    const erroresIgnorados = ['No MultiFormat Readers', 'NotFoundException', 'No barcode found'];
    const esErrorIgnorado = erroresIgnorados.some(msg =>
      error?.message?.includes(msg) || error?.name?.includes(msg)
    );
    if (esErrorIgnorado) return;
    console.warn('⚠️ [ERROR] Error durante escaneo:', error);
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
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las sucursales',
          life: 3000
        });
      }
    });
  }

  cargarAlmacenesOrigen(idSucursal: string) {
    this.almacenesOrigen = [];
    this.form.get('almacenOrigen')?.reset();

    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.almacenesOrigen = response.map((item: any) => ({
            label: item.nombre,
            value: item.id
          }));
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los almacenes de origen',
          life: 3000
        });
      }
    });
  }

  cargarAlmacenesDestino(idSucursal: string) {
    this.almacenesDestino = [];
    this.form.get('almacenDestino')?.reset();

    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.almacenesDestino = response.map((item: any) => ({
            label: item.nombre,
            value: item.id
          }));
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los almacenes de destino',
          life: 3000
        });
      }
    });
  }

  onScanner() {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Debe seleccionar Sucursal y Almacén de Origen y Destino',
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
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo vacío',
        detail: 'Debe ingresar un ID de producto',
        life: 2000
      });
      return;
    }

    if (this.vehiculos.some(v => v.idProducto === idProducto)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicado',
        detail: 'Este producto ya fue agregado',
        life: 2000
      });
      return;
    }

    this.master.getCarPorIdProducto(idProducto).subscribe({
      next: (data) => {
        if (!data || !data.idProducto) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No encontrado',
            detail: 'No se encontró información del producto',
            life: 3000
          });
          return;
        }

        const nuevoVehiculo: Vehiculo = {
          idProducto: data.idProducto?.trim(),
          nombre: data.nombre?.trim(),
          idMedida: data.idMedida?.trim(),
          cantidad: this.cantidad
        };

        this.vehiculos.push(nuevoVehiculo);

        this.idProductoInput = '';
        this.cantidad = 1;

        this.messageService.add({
          severity: 'success',
          summary: 'Producto agregado',
          detail: `${nuevoVehiculo.idProducto} - ${nuevoVehiculo.nombre}`,
          life: 2000
        });

        setTimeout(() => {
          this.idProductoInputElement?.nativeElement.focus();
        }, 100);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al consultar el producto',
          life: 3000
        });
      }
    });
  }

  eliminarVehiculo(index: number) {
    this.vehiculos.splice(index, 1);
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
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin productos',
        detail: 'Debe agregar al menos un producto',
        life: 3000
      });
      return;
    }

    const idsucursal = this.form.get('sucursalOrigen')?.value;
    const idalmacen = this.form.get('almacenOrigen')?.value;
    const idsucursaldestino = this.form.get('sucursalDestino')?.value;
    const idalmacendestino = this.form.get('almacenDestino')?.value;

    if (!idsucursal || !idalmacen || !idsucursaldestino || !idalmacendestino) {
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
      idproducto: v.idProducto,
      cantidad: v.cantidad
    }));

    this.api.registroTransferenciaAlmacenes(
      idsucursal,
      idalmacen,
      idsucursaldestino,
      idalmacendestino,
      fecha,
      detalle
    ).subscribe({
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
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: error?.error?.message || 'No se pudo registrar la transferencia',
          life: 4000
        });
      }
    });
  }

  ngOnDestroy() {
    this.scannerActivo = false;
  }
}
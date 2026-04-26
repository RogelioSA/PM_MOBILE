// rendicion-gastos.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Menu } from '../menu/menu';
import { Master } from '../services/master';
import { Api } from '../services/api';
import { CookieService } from 'ngx-cookie-service';

interface ArchivoRendicion {
  id: string;
  nombre: string;
  url: string;
  archivo?: File;
  size?: number;
}

interface Rendicion {
  id: number;
  tipo: 'OT' | 'FACTURA';
  tipoNombre: string;
  sucursal: string;
  sucursalNombre: string;
  ordenTrabajo: string;
  fecha: string;
  proveedor?: string;
  monto?: number;
  serie?: string;
  numero?: string;
  ruta?: string;
  archivos: ArchivoRendicion[];
  cargandoArchivos: boolean;
}

interface GastoOTForm {
  fecha: Date | null;
  sucursal: string;
  ordenTrabajo: string;
  proveedor: string;
  proveedorId: string;
  monto: number | null;
  serie: string;
  numero: string;
  archivos: ArchivoRendicion[];
}

interface FacturaForm {
  fecha: Date | null;
  sucursal: string;
  ordenTrabajo: string;
  proveedor: string;
  proveedorId: string;
  monto: number | null;
  serie: string;
  numero: string;
  archivos: ArchivoRendicion[];
}

interface ProveedorOption {
  label: string;
  value: string;
  data: any;
}

// ─── Nuevo Proveedor ────────────────────────────────────────────────────────
type TipoDocumento = 'DNI' | 'RUC';

interface NuevoProveedorForm {
  tipoDocumento: TipoDocumento;
  nroDocumento: string;
  // DNI
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  // RUC
  razonSocial: string;
  // Común
  telefono1: string;
  telefono2: string;
  correo: string;
  direccion: string;
}

@Component({
  selector: 'app-rendicion-gastos',
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
    FileUploadModule,
    ToastModule,
    TooltipModule,
    DatePickerModule,
    Menu
  ],
  templateUrl: './rendicion-gastos.html',
  styleUrl: './rendicion-gastos.css',
  providers: [MessageService]
})
export class RendicionGastos implements OnInit {

  rendiciones: Rendicion[] = [];
  cargando = false;
  cargandoOrdenes = false;

  // Modales
  mostrarSelectorTipo = false;
  mostrarFormGasto = false;
  mostrarFormFactura = false;
  mostrarDetalle = false;

  // Detalle
  rendicionSeleccionada: Rendicion | null = null;

  // Filtros
  tipoFiltro = '';
  sucursalFiltro = '';
  fechaDesde = '';
  fechaHasta = '';

  tiposRendicion = [
    { label: 'Todos', value: '' },
    { label: 'Nuevo Gasto', value: 'OT' },
    { label: 'Factura Escaneada', value: 'FACTURA' }
  ];

  sucursales: { label: string; value: string }[] = [];
  ordenesProduccionOT: { label: string; value: string }[] = [];
  ordenesProduccionFactura: { label: string; value: string }[] = [];

  proveedoresOT: ProveedorOption[] = [];
  proveedoresFactura: ProveedorOption[] = [];
  buscandoProveedoresOT = false;
  buscandoProveedoresFactura = false;

  // Texto de filtro actual para saber si mostrar botón "Nuevo Proveedor"
  filtroProveedorOTActual = '';
  filtroProveedorFacturaActual = '';

  private busquedaOT$ = new Subject<string>();
  private busquedaFactura$ = new Subject<string>();

  escaneandoFactura = false;
  archivoFacturaPendiente: File | null = null;

  otForm: GastoOTForm = this.initOtForm();
  facturaForm: FacturaForm = this.initFacturaForm();

  // ── Nuevo Proveedor ────────────────────────────────────────────────────────
  mostrarNuevoProveedor = false;
  /** 'OT' | 'FACTURA' — contexto desde donde se abrió el card */
  nuevoProveedorContexto: 'OT' | 'FACTURA' = 'OT';
  guardandoProveedor = false;
  consultandoDocumento = false;
  datosFactilizaCargados = false;

  tiposDocumento: { label: string; value: TipoDocumento }[] = [
    { label: 'DNI', value: 'DNI' },
    { label: 'RUC', value: 'RUC' }
  ];

  nuevoProveedorForm: NuevoProveedorForm = this.initNuevoProveedorForm();

  // ── Constantes del módulo ──────────────────────────────────────────────────
  private readonly idEmpresa = '001';
  private readonly modulo = 'CAJACHICA';

  private mesesNombre = [
    'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
    'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
  ];

  constructor(
    private messageService: MessageService,
    private masterService: Master,
    private apiService: Api,
    private cookieService: CookieService
  ) {}

  ngOnInit() {
    this.inicializarFechasMes();
    this.cargarSucursales();
    this.configurarBusquedaProveedores();
    this.cargarRendiciones();
  }

  // ─── Init forms ────────────────────────────────────────────────────────────

  cargarRendiciones() {
    this.cargando = true;
    const usuario = this.cookieService.get('usuario') || '';

    this.apiService.listarGastoSimple(
      usuario,
      this.fechaDesde,
      this.fechaHasta,
      this.sucursalFiltro,
      '',
      ''
    ).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.rendiciones = res.data.map((item: any) => ({
            id: item.id,
            tipo: 'OT' as const,
            tipoNombre: 'Nuevo Gasto',
            sucursal: item.idsucursal,
            sucursalNombre: item.sucursal,
            ordenTrabajo: item.idordentrabajo,
            fecha: item.fecha?.substring(0, 10) ?? '',
            proveedor: item.proveedor,
            monto: item.monto,
            serie: item.serie,
            numero: item.numero,
            ruta: item.referenciacarpeta,
            archivos: [],
            cargandoArchivos: false
          }));
        } else {
          this.rendiciones = [];
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando rendiciones:', err);
        this.cargando = false;
      }
    });
  }

  aplicarFiltros() {
    this.cargarRendiciones();
  }

  initOtForm(): GastoOTForm {
    return {
      fecha: null, sucursal: '', ordenTrabajo: '',
      proveedor: '', proveedorId: '', monto: null, serie: '', numero: '',
      archivos: []
    };
  }

  initFacturaForm(): FacturaForm {
    return {
      fecha: null, sucursal: '', ordenTrabajo: '',
      proveedor: '', proveedorId: '', monto: null, serie: '', numero: '',
      archivos: []
    };
  }

  initNuevoProveedorForm(): NuevoProveedorForm {
    return {
      tipoDocumento: 'DNI',
      nroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      razonSocial: '',
      telefono1: '',
      telefono2: '',
      correo: '',
      direccion: ''
    };
  }

  // ─── Fechas ─────────────────────────────────────────────────────────────────

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

  dateToString(fecha: Date | null): string {
    if (!fecha) return '';
    return this.formatearFecha(fecha);
  }

  // ─── Sucursales ─────────────────────────────────────────────────────────────

  cargarSucursales() {
    this.masterService.getSucursales().subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.sucursales = res.data.map((s: any) => ({
            label: s.descripcion.length > 30 ? s.descripcion.substring(0, 30) + '…' : s.descripcion,
            value: s.idSucursal
          }));
        }
      },
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }

  // ─── Proveedores ─────────────────────────────────────────────────────────────

  configurarBusquedaProveedores() {
    this.busquedaOT$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((filtro: string) => {
          if (filtro.length < 3) { this.proveedoresOT = []; this.buscandoProveedoresOT = false; return []; }
          this.buscandoProveedoresOT = true;
          return this.masterService.buscarProveedores(filtro);
        })
      )
      .subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : (res?.data || []);
          this.proveedoresOT = lista.map((p: any) => ({ label: p.name, value: p.idCliente, data: p }));
          this.buscandoProveedoresOT = false;
        },
        error: () => { this.buscandoProveedoresOT = false; }
      });

    this.busquedaFactura$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((filtro: string) => {
          if (filtro.length < 3) { this.proveedoresFactura = []; this.buscandoProveedoresFactura = false; return []; }
          this.buscandoProveedoresFactura = true;
          return this.masterService.buscarProveedores(filtro);
        })
      )
      .subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : (res?.data || []);
          this.proveedoresFactura = lista.map((p: any) => ({ label: p.name, value: p.idCliente, data: p }));
          this.buscandoProveedoresFactura = false;
        },
        error: () => { this.buscandoProveedoresFactura = false; }
      });
  }

  onFiltroProveedorOT(event: any) {
    const filtro: string = event?.filter ?? event ?? '';
    this.filtroProveedorOTActual = filtro;
    if (filtro.length >= 3) this.buscandoProveedoresOT = true;
    this.busquedaOT$.next(filtro);
  }

  onFiltroProveedorFactura(event: any) {
    const filtro: string = event?.filter ?? event ?? '';
    this.filtroProveedorFacturaActual = filtro;
    if (filtro.length >= 3) this.buscandoProveedoresFactura = true;
    this.busquedaFactura$.next(filtro);
  }

  onProveedorSeleccionadoOT(value: string) {
    const prov = this.proveedoresOT.find(p => p.value === value);
    this.otForm.proveedor = prov?.label || '';
    this.otForm.proveedorId = value;
  }

  onProveedorSeleccionadoFactura(value: string) {
    const prov = this.proveedoresFactura.find(p => p.value === value);
    this.facturaForm.proveedor = prov?.label || '';
    this.facturaForm.proveedorId = value;
  }

  // ─── Helpers proveedor: ¿mostrar botón nuevo? ──────────────────────────────

  get mostrarBtnNuevoProveedorOT(): boolean {
    return this.filtroProveedorOTActual.length >= 3 && !this.buscandoProveedoresOT && this.proveedoresOT.length === 0;
  }

  get mostrarBtnNuevoProveedorFactura(): boolean {
    return this.filtroProveedorFacturaActual.length >= 3 && !this.buscandoProveedoresFactura && this.proveedoresFactura.length === 0;
  }

  // ─── Abrir dialog Nuevo Proveedor ──────────────────────────────────────────

  abrirNuevoProveedor(contexto: 'OT' | 'FACTURA') {
    this.nuevoProveedorContexto = contexto;
    this.nuevoProveedorForm = this.initNuevoProveedorForm();
    this.datosFactilizaCargados = false;
    this.mostrarNuevoProveedor = true;
  }

  cerrarNuevoProveedor() {
    this.mostrarNuevoProveedor = false;
  }

  // ─── Cambio tipo documento → limpiar campos ────────────────────────────────

  onTipoDocumentoChange() {
    this.nuevoProveedorForm.nroDocumento = '';
    this.nuevoProveedorForm.nombres = '';
    this.nuevoProveedorForm.apellidoPaterno = '';
    this.nuevoProveedorForm.apellidoMaterno = '';
    this.nuevoProveedorForm.razonSocial = '';
    this.nuevoProveedorForm.direccion = '';
    this.datosFactilizaCargados = false;
  }

  // ─── Consultar Factiliza al completar el nro documento ────────────────────

  onNroDocumentoInput() {
    const nro = this.nuevoProveedorForm.nroDocumento.trim();
    const esDNI = this.nuevoProveedorForm.tipoDocumento === 'DNI';
    const esRUC = this.nuevoProveedorForm.tipoDocumento === 'RUC';

    if ((esDNI && nro.length === 8) || (esRUC && nro.length === 11)) {
      this.consultarFactiliza(nro);
    } else {
      // Limpiar si el usuario borra
      this.datosFactilizaCargados = false;
      if (esDNI) {
        this.nuevoProveedorForm.nombres = '';
        this.nuevoProveedorForm.apellidoPaterno = '';
        this.nuevoProveedorForm.apellidoMaterno = '';
      } else {
        this.nuevoProveedorForm.razonSocial = '';
      }
      this.nuevoProveedorForm.direccion = '';
    }
  }

  private consultarFactiliza(nroDocumento: string) {
    this.consultandoDocumento = true;
    this.datosFactilizaCargados = false;

    this.masterService.factiliza(nroDocumento).subscribe({
      next: (res: any) => {
        this.consultandoDocumento = false;
        if (!res?.success || !res.data) {
          this.messageService.add({ severity: 'warn', summary: 'Sin resultados', detail: 'No se encontró información para el documento', life: 3000 });
          return;
        }
        const d = res.data;
        if (this.nuevoProveedorForm.tipoDocumento === 'DNI') {
          this.nuevoProveedorForm.nombres = (d.nombres || '').toUpperCase();
          this.nuevoProveedorForm.apellidoPaterno = (d.apellido_paterno || '').toUpperCase();
          this.nuevoProveedorForm.apellidoMaterno = (d.apellido_materno || '').toUpperCase();
          this.nuevoProveedorForm.direccion = (d.direccion || '').toUpperCase();
        } else {
          this.nuevoProveedorForm.razonSocial = (d.nombre_o_razon_social || '').toUpperCase();
          this.nuevoProveedorForm.direccion = (d.direccion || '').toUpperCase();
        }
        this.datosFactilizaCargados = true;
        this.messageService.add({ severity: 'success', summary: 'Datos cargados', detail: 'Información obtenida correctamente', life: 2500 });
      },
      error: () => {
        this.consultandoDocumento = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo consultar el documento', life: 3000 });
      }
    });
  }

  // ─── Guardar nuevo proveedor ───────────────────────────────────────────────

  guardarNuevoProveedor() {
    const f = this.nuevoProveedorForm;
    const esDNI = f.tipoDocumento === 'DNI';

    // Validaciones básicas
    if (!f.nroDocumento.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Ingrese el número de documento', life: 3000 });
      return;
    }
    if (esDNI && !f.nombres.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Consulte el DNI primero', life: 3000 });
      return;
    }
    if (!esDNI && !f.razonSocial.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Consulte el RUC primero', life: 3000 });
      return;
    }

    // Teléfono combinado sin espacios: "tel1,tel2"
    const telefonoCombinado = [f.telefono1.trim(), f.telefono2.trim()].filter(Boolean).join(',');

    const codigoDocumento = esDNI ? '01' : '06';

    const params: any = {
      idCliente: '0',
      tipoDocumento: codigoDocumento,
      nroDocumento: f.nroDocumento.trim(),
      telefono: telefonoCombinado || '999999999,999999998',
      email: f.correo.trim() || 'sinemail@perumotor.com.pe',
      direccion: (f.direccion.trim().toUpperCase() || '-').substring(0, 100),
    };

    if (esDNI) {
      params.nombres = f.nombres.trim().toUpperCase().substring(0, 80);
      params.apellidoPaterno = f.apellidoPaterno.trim().toUpperCase().substring(0, 60);
      params.apellidoMaterno = f.apellidoMaterno.trim().toUpperCase().substring(0, 60);
      params.razonSocial = '';
    } else {
      params.razonSocial = f.razonSocial.trim().toUpperCase().substring(0, 200);
      params.nombres = '';
      params.apellidoPaterno = '';
      params.apellidoMaterno = '';
    }

    this.guardandoProveedor = true;
    this.apiService.crearOActualizarClieProv(params).subscribe({
      next: (res: any) => {
        this.guardandoProveedor = false;
        if (!res?.success) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message || 'No se pudo crear el proveedor', life: 4000 });
          return;
        }

        this.messageService.add({ severity: 'success', summary: 'Proveedor creado', detail: 'El proveedor fue registrado exitosamente', life: 3000 });

        // Determinar el nombre a mostrar
        const nombreLabel = esDNI
          ? `${f.apellidoPaterno.trim()} ${f.apellidoMaterno.trim()}, ${f.nombres.trim()}`.toUpperCase()
          : f.razonSocial.trim().toUpperCase();

        // El id devuelto por la API (ajustar según respuesta real)
        const nuevoId = res?.data?.idCliente ?? res?.data ?? f.nroDocumento;

        const nuevaOpcion: ProveedorOption = {
          label: nombreLabel,
          value: String(nuevoId),
          data: res?.data
        };

        // Inyectar en el contexto correcto y seleccionarlo automáticamente
        if (this.nuevoProveedorContexto === 'OT') {
          this.proveedoresOT = [nuevaOpcion, ...this.proveedoresOT];
          this.otForm.proveedorId = String(nuevoId);
          this.otForm.proveedor = nombreLabel;
        } else {
          this.proveedoresFactura = [nuevaOpcion, ...this.proveedoresFactura];
          this.facturaForm.proveedorId = String(nuevoId);
          this.facturaForm.proveedor = nombreLabel;
        }

        this.cerrarNuevoProveedor();
      },
      error: () => {
        this.guardandoProveedor = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el proveedor', life: 4000 });
      }
    });
  }

  // ─── Órdenes de producción ───────────────────────────────────────────────────

  onSucursalChangeOT(idSucursal: string) {
    this.otForm.ordenTrabajo = '';
    this.ordenesProduccionOT = [];
    if (!idSucursal) return;
    this.cargandoOrdenes = true;
    this.masterService.getOrdenesProduccionPorSucursal(idSucursal).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.ordenesProduccionOT = res.data.map((o: any) => ({
            label: `OT${o.serie}-${o.numero}`,
            value: o.idOrdenPro
          }));
        }
        this.cargandoOrdenes = false;
      },
      error: () => { this.cargandoOrdenes = false; }
    });
  }

  onSucursalChangeFactura(idSucursal: string) {
    this.facturaForm.ordenTrabajo = '';
    this.ordenesProduccionFactura = [];
    if (!idSucursal) return;
    this.cargandoOrdenes = true;
    this.masterService.getOrdenesProduccionPorSucursal(idSucursal).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.ordenesProduccionFactura = res.data.map((o: any) => ({
            label: `OT${o.serie}-${o.numero}`,
            value: o.idOrdenPro
          }));
        }
        this.cargandoOrdenes = false;
      },
      error: () => { this.cargandoOrdenes = false; }
    });
  }

  // ─── Filtros ────────────────────────────────────────────────────────────────

  limpiarFiltros() {
    this.tipoFiltro = '';
    this.sucursalFiltro = '';
    this.inicializarFechasMes();
    this.aplicarFiltros();
  }

  // ─── Selector tipo ──────────────────────────────────────────────────────────

  nuevaRendicion() {
    this.mostrarSelectorTipo = true;
  }

  seleccionarTipo(tipo: 'OT' | 'FACTURA') {
    this.mostrarSelectorTipo = false;
    if (tipo === 'OT') {
      this.otForm = this.initOtForm();
      this.ordenesProduccionOT = [];
      this.proveedoresOT = [];
      this.filtroProveedorOTActual = '';
      this.mostrarFormGasto = true;
    } else {
      this.facturaForm = this.initFacturaForm();
      this.ordenesProduccionFactura = [];
      this.proveedoresFactura = [];
      this.filtroProveedorFacturaActual = '';
      this.archivoFacturaPendiente = null;
      this.mostrarFormFactura = true;
    }
  }

  // ─── Nuevo Gasto (OT) ──────────────────────────────────────────────────────

  onFileSelectOT(event: any) {
    const files: File[] = event.files || [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.otForm.archivos.push({
          id: Date.now().toString() + Math.random(),
          nombre: file.name,
          url: e.target.result,
          archivo: file,
          size: file.size
        });
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarArchivoOT(archivo: ArchivoRendicion) {
    this.otForm.archivos = this.otForm.archivos.filter(a => a.id !== archivo.id);
  }

  guardarGasto() {
    const { fecha, sucursal, ordenTrabajo, proveedorId, monto, serie, numero } = this.otForm;
    const fechaStr = this.dateToString(fecha);

    if (!fechaStr || !sucursal || !ordenTrabajo || !proveedorId || !monto || !serie.trim() || !numero.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Complete todos los campos requeridos', life: 3000 });
      return;
    }

    const { niveles, rutaFinal, nombreDocumento } = this.construirNiveles(
      fechaStr, sucursal, serie, numero, this.proveedoresOT, proveedorId
    );

    const usuario = this.cookieService.get('usuario') || '';
    this.cargando = true;

    this.apiService.insertarGastoSimple(
      fechaStr, sucursal, monto, usuario, ordenTrabajo,
      proveedorId, serie.trim().toUpperCase(), numero.trim(),
      `${rutaFinal}/${nombreDocumento}`
    ).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message || 'No se pudo guardar el gasto', life: 4000 });
          this.cargando = false;
          return;
        }

        this.crearJerarquiaYSubirArchivos(niveles, nombreDocumento, this.otForm.archivos)
          .then(() => {
            this.messageService.add({ severity: 'success', summary: 'Gasto registrado', detail: `Guardado en ${rutaFinal}/${nombreDocumento}`, life: 4000 });
            this.cerrarFormGasto();
            this.cargarRendiciones();
          })
          .catch(() => {
            this.messageService.add({ severity: 'warn', summary: 'Gasto guardado, error en carpetas', detail: 'El registro se creó pero hubo un problema al crear las carpetas o subir archivos.', life: 5000 });
            this.cerrarFormGasto();
            this.cargarRendiciones();
          })
          .finally(() => { this.cargando = false; });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el gasto', life: 4000 });
        this.cargando = false;
      }
    });
  }

  cerrarFormGasto() {
    this.mostrarFormGasto = false;
    this.otForm = this.initOtForm();
    this.ordenesProduccionOT = [];
    this.proveedoresOT = [];
    this.filtroProveedorOTActual = '';
  }

  // ─── Jerarquía de carpetas ──────────────────────────────────────────────────

  private construirNiveles(
    fechaStr: string,
    idSucursal: string,
    serie: string,
    numero: string,
    proveedores: ProveedorOption[],
    proveedorId: string
  ) {
    const d = new Date(fechaStr + 'T00:00:00');
    const año = String(d.getFullYear());
    const sucursalLabel = this.sucursales.find(s => s.value === idSucursal)?.label?.toUpperCase() || idSucursal;
    const mes = this.mesesNombre[d.getMonth()];
    const fechaDia = fechaStr;

    const ruc = proveedorId.trim();
    const nombreDocumento = `${ruc}-${serie.trim().toUpperCase()}-${numero.trim()}`;

    const niveles = [
      { nombre: año },
      { nombre: sucursalLabel },
      { nombre: mes },
      { nombre: fechaDia }
    ];

    const rutaFinal = `${año}/${sucursalLabel}/${mes}/${fechaDia}`;
    return { niveles, rutaFinal, nombreDocumento };
  }

  private async crearJerarquiaYSubirArchivos(
    niveles: { nombre: string }[],
    nombreDocumento: string,
    archivos: ArchivoRendicion[]
  ): Promise<void> {
    const usuario = this.cookieService.get('usuario') || '';
    let idCarpetaPadreActual = 0;

    for (let i = 0; i < niveles.length - 1; i++) {
      idCarpetaPadreActual = await this.navegarOCrearNivel(
        niveles[i].nombre, idCarpetaPadreActual, usuario, false
      );
    }

    const idCarpetaFecha = await this.navegarOCrearNivel(
      niveles[niveles.length - 1].nombre, idCarpetaPadreActual, usuario, true
    );

    const now = new Date();
    const periodo = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    await this.crearDocumentoSiNoExiste(nombreDocumento, idCarpetaFecha, periodo, usuario);

    for (const archivo of archivos) {
      if (!archivo.archivo) continue;
      const nombreSinExt = archivo.nombre.replace(/\.[^/.]+$/, '');
      const tipo = archivo.archivo.type || 'application/octet-stream';
      await this.subirArchivoApi(nombreDocumento, nombreSinExt, tipo, archivo.archivo);
    }
  }

  private crearDocumentoSiNoExiste(
    idCarpeta: string,
    idCarpetaPadre: number,
    periodo: string,
    usuario: string
  ): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.existeDocumento(this.idEmpresa, idCarpeta).subscribe({
        next: (res) => {
          if (res.success === false || !res.data?.length) {
            this.apiService.crearDocumento(this.idEmpresa, idCarpeta, periodo, idCarpetaPadre, usuario)
              .subscribe({ next: () => resolve(), error: () => resolve() });
          } else {
            resolve();
          }
        },
        error: () => resolve()
      });
    });
  }

  private navegarOCrearNivel(
    nombreCarpeta: string,
    idCarpetaPadre: number,
    usuario: string,
    esFinal: boolean
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const idParaListar = idCarpetaPadre === 0 ? '' : String(idCarpetaPadre);

      this.apiService.listarCarpeta(idParaListar, this.modulo, usuario).subscribe({
        next: (res: any) => {
          const hijos: any[] = Array.isArray(res?.data) ? res.data : [];
          const encontrada = hijos.find(
            (h: any) => (h.nombreCarpeta || '').trim().toUpperCase() === nombreCarpeta.trim().toUpperCase()
          );

          if (encontrada) {
            resolve(Number(encontrada.idCarpeta));
          } else {
            const body = {
              nombreCarpeta,
              idCarpetaPadre,
              carpetaRaiz: idCarpetaPadre === 0,
              usuarioCreador: usuario,
              final: esFinal
            };

            this.apiService.crearCarpeta(body).subscribe({
              next: (resCrear: any) => {
                const nuevoId = (typeof resCrear?.data === 'number' ? resCrear.data : null)
                  ?? resCrear?.data?.idCarpeta
                  ?? resCrear?.data?.[0]?.idCarpeta
                  ?? resCrear?.idCarpeta
                  ?? 0;

                if (nuevoId !== 0) {
                  resolve(Number(nuevoId));
                } else {
                  this.apiService.listarCarpeta(idParaListar, this.modulo, usuario).subscribe({
                    next: (resListar: any) => {
                      const hijosActualizados: any[] = Array.isArray(resListar?.data) ? resListar.data : [];
                      const creada = hijosActualizados.find(
                        (h: any) => (h.nombreCarpeta || '').trim().toUpperCase() === nombreCarpeta.trim().toUpperCase()
                      );
                      resolve(creada ? Number(creada.idCarpeta) : 0);
                    },
                    error: () => resolve(0)
                  });
                }
              },
              error: (err: any) => reject(err)
            });
          }
        },
        error: (err: any) => reject(err)
      });
    });
  }

  private subirArchivoApi(referenciaCarpeta: string, nombreSinExt: string, tipo: string, file: File): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.subirArchivoCarpeta(referenciaCarpeta, nombreSinExt, tipo, file).subscribe({
        next: () => resolve(),
        error: (err: any) => {
          console.warn(`subirArchivo (${nombreSinExt}):`, err?.message || err);
          resolve();
        }
      });
    });
  }

  // ─── Escanear Factura ──────────────────────────────────────────────────────

  onFileSelectFactura(event: any) {
    const todosLosArchivos: File[] = event.currentFiles || event.files || [];
    const nombresExistentes = new Set(this.facturaForm.archivos.map(a => a.nombre));
    const archivosNuevos = todosLosArchivos.filter((f: File) => !nombresExistentes.has(f.name));

    if (archivosNuevos.length === 0) return;

    for (const file of archivosNuevos) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.facturaForm.archivos.push({
          id: Date.now().toString() + Math.random(),
          nombre: file.name,
          url: e.target.result,
          archivo: file,
          size: file.size
        });
      };
      reader.readAsDataURL(file);
    }

    const archivoParaEscanear = archivosNuevos[0];
    const ext = archivoParaEscanear.name.split('.').pop()?.toLowerCase() || '';
    const esImagen = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    const esPdf = ext === 'pdf';

    if (!esImagen && !esPdf) {
      this.messageService.add({ severity: 'warn', summary: 'Formato no soportado', detail: 'Solo se pueden escanear imágenes o PDF', life: 3000 });
      return;
    }

    this.escaneandoFactura = true;
    const readerEscaneo = new FileReader();
    readerEscaneo.onload = (e: any) => {
      const base64 = (e.target.result as string).split(',')[1];
      const mediaType = esPdf ? 'application/pdf' : archivoParaEscanear.type;
      this.enviarFacturaAIA(base64, mediaType);
    };
    readerEscaneo.readAsDataURL(archivoParaEscanear);
  }

  private enviarFacturaAIA(base64: string, mediaType: string) {
    const esPdf = mediaType === 'application/pdf';
    const contentBlock: any = esPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: `Analiza este comprobante y extrae en JSON puro sin markdown:\n{"proveedor":"nombre del emisor","ruc":"RUC o nro documento emisor","monto":NUMERO,"serie":"ej F001","numero":"correlativo","fecha":"YYYY-MM-DD"}\nSi no encuentras un campo usa null. Responde SOLO el JSON.` }
        ]
      }]
    };

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(r => r.json())
      .then(data => {
        const bloque = data?.content?.find((c: any) => c.type === 'text');
        if (!bloque?.text) throw new Error('Sin texto en respuesta');
        const parsed = JSON.parse(bloque.text.replace(/```json|```/g, '').trim());
        this.autocompletarFactura(parsed);
        this.messageService.add({ severity: 'success', summary: 'Factura escaneada', detail: 'Revisa los datos extraídos y completa lo que falte.', life: 4000 });
        this.escaneandoFactura = false;
      })
      .catch(err => {
        console.error('Error escaneo factura:', err);
        this.messageService.add({ severity: 'warn', summary: 'No se pudo extraer', detail: 'Completa los datos manualmente.', life: 4000 });
        this.escaneandoFactura = false;
      });
  }

  private autocompletarFactura(datos: any) {
    if (datos.fecha) {
      const [year, month, day] = datos.fecha.split('-').map(Number);
      this.facturaForm.fecha = new Date(year, month - 1, day);
    }
    if (datos.serie) this.facturaForm.serie = datos.serie.toUpperCase();
    if (datos.numero) this.facturaForm.numero = datos.numero;
    if (datos.monto !== null && datos.monto !== undefined) this.facturaForm.monto = parseFloat(datos.monto);
    if (datos.proveedor) {
      this.facturaForm.proveedor = datos.proveedor;
      if (datos.proveedor.length >= 3) {
        this.buscandoProveedoresFactura = true;
        this.busquedaFactura$.next(datos.proveedor.substring(0, 20));
      }
    }
  }

  eliminarArchivoFactura(archivo: ArchivoRendicion) {
    this.facturaForm.archivos = this.facturaForm.archivos.filter(a => a.id !== archivo.id);
  }

  guardarFactura() {
    const { fecha, sucursal, ordenTrabajo, proveedorId, monto, serie, numero } = this.facturaForm;
    const fechaStr = this.dateToString(fecha);

    if (!fechaStr || !sucursal || !ordenTrabajo || !proveedorId || !monto || !serie.trim() || !numero.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Complete todos los campos requeridos', life: 3000 });
      return;
    }

    const { niveles, rutaFinal, nombreDocumento } = this.construirNiveles(
      fechaStr, sucursal, serie, numero, this.proveedoresFactura, proveedorId
    );

    const usuario = this.cookieService.get('usuario') || '';
    this.cargando = true;

    this.apiService.insertarGastoSimple(
      fechaStr, sucursal, monto, usuario, ordenTrabajo,
      proveedorId, serie.trim().toUpperCase(), numero.trim(),
      `${rutaFinal}/${nombreDocumento}`
    ).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message || 'No se pudo guardar la factura', life: 4000 });
          this.cargando = false;
          return;
        }

        this.crearJerarquiaYSubirArchivos(niveles, nombreDocumento, this.facturaForm.archivos)
          .then(() => {
            this.messageService.add({ severity: 'success', summary: 'Factura registrada', detail: `Guardado en ${rutaFinal}/${nombreDocumento}`, life: 4000 });
            this.cerrarFormFactura();
            this.cargarRendiciones();
          })
          .catch(() => {
            this.messageService.add({ severity: 'warn', summary: 'Factura guardada, error en carpetas', detail: 'El registro se creó pero hubo un problema al crear las carpetas.', life: 5000 });
            this.cerrarFormFactura();
            this.cargarRendiciones();
          })
          .finally(() => { this.cargando = false; });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la factura', life: 4000 });
        this.cargando = false;
      }
    });
  }

  cerrarFormFactura() {
    this.mostrarFormFactura = false;
    this.facturaForm = this.initFacturaForm();
    this.ordenesProduccionFactura = [];
    this.proveedoresFactura = [];
    this.filtroProveedorFacturaActual = '';
    this.archivoFacturaPendiente = null;
    this.escaneandoFactura = false;
  }

  // ─── Detalle ────────────────────────────────────────────────────────────────

  verDetalle(rendicion: Rendicion) {
    this.rendicionSeleccionada = { ...rendicion };
    this.mostrarDetalle = true;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getIconoArchivo(nombre: string): string {
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pi pi-file-pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'pi pi-image';
    if (['doc', 'docx'].includes(ext)) return 'pi pi-file-word';
    if (['xls', 'xlsx'].includes(ext)) return 'pi pi-file-excel';
    return 'pi pi-file';
  }

  getTipoColor(tipo: string): string {
    switch (tipo) {
      case 'OT': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'FACTURA': return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }
}
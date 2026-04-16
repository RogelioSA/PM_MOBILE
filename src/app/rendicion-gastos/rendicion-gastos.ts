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
  fecha: string;
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
  fecha: string;
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

  // Rutas S3 generadas dinámicamente
  rutaGeneradaOT = '';
  rutaGeneradaFactura = '';

  // Filtros
  tipoFiltro = '';
  sucursalFiltro = '';
  fechaDesde = '';
  fechaHasta = '';

  // Opciones
  tiposRendicion = [
    { label: 'Todos', value: '' },
    { label: 'Nuevo Gasto', value: 'OT' },
    { label: 'Factura Escaneada', value: 'FACTURA' }
  ];

  // Sucursales cargadas desde el API
  sucursales: { label: string; value: string }[] = [];

  // Órdenes de producción según sucursal seleccionada
  ordenesProduccionOT: { label: string; value: string }[] = [];
  ordenesProduccionFactura: { label: string; value: string }[] = [];

  // Proveedores (búsqueda lazy ≥ 3 letras)
  proveedoresOT: ProveedorOption[] = [];
  proveedoresFactura: ProveedorOption[] = [];
  buscandoProveedoresOT = false;
  buscandoProveedoresFactura = false;

  // Subjects para debounce de búsqueda de proveedores
  private busquedaOT$ = new Subject<string>();
  private busquedaFactura$ = new Subject<string>();

  // Escaneo de factura
  escaneandoFactura = false;
  archivoFacturaPendiente: File | null = null;

  // Formulario Nuevo Gasto (OT)
  otForm: GastoOTForm = this.initOtForm();

  // Formulario Factura
  facturaForm: FacturaForm = this.initFacturaForm();

  // Nombres de meses en español para la ruta
  private meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

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
      fecha: '', sucursal: '', ordenTrabajo: '',
      proveedor: '', proveedorId: '', monto: null, serie: '', numero: '',
      archivos: []
    };
  }

  initFacturaForm(): FacturaForm {
    return {
      fecha: '', sucursal: '', ordenTrabajo: '',
      proveedor: '', proveedorId: '', monto: null, serie: '', numero: '',
      archivos: []
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

  // ─── Sucursales ─────────────────────────────────────────────────────────────

  cargarSucursales() {
    this.masterService.getSucursales().subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.sucursales = res.data.map((s: any) => ({
            // Truncar nombres muy largos para que no desborden el select
            label: s.descripcion.length > 30 ? s.descripcion.substring(0, 30) + '…' : s.descripcion,
            value: s.idSucursal
          }));
        }
      },
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }

  // ─── Búsqueda de proveedores (lazy, mín 3 letras) ───────────────────────────

  configurarBusquedaProveedores() {
    // Proveedor en form OT
    this.busquedaOT$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((filtro: string) => {
          if (filtro.length < 3) {
            this.proveedoresOT = [];
            this.buscandoProveedoresOT = false;
            return [];
          }
          this.buscandoProveedoresOT = true;
          return this.masterService.buscarProveedores(filtro);
        })
      )
      .subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : (res?.data || []);
          this.proveedoresOT = lista.map((p: any) => ({
            label: p.name,
            value: p.idCliente,
            data: p
          }));
          this.buscandoProveedoresOT = false;
        },
        error: () => { this.buscandoProveedoresOT = false; }
      });

    // Proveedor en form Factura
    this.busquedaFactura$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((filtro: string) => {
          if (filtro.length < 3) {
            this.proveedoresFactura = [];
            this.buscandoProveedoresFactura = false;
            return [];
          }
          this.buscandoProveedoresFactura = true;
          return this.masterService.buscarProveedores(filtro);
        })
      )
      .subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : (res?.data || []);
          this.proveedoresFactura = lista.map((p: any) => ({
            label: p.name,
            value: p.idCliente,
            data: p
          }));
          this.buscandoProveedoresFactura = false;
        },
        error: () => { this.buscandoProveedoresFactura = false; }
      });
  }

  onFiltroProveedorOT(event: any) {
    const filtro: string = event?.filter ?? event ?? '';
    if (filtro.length >= 3) {
      this.buscandoProveedoresOT = true;
    }
    this.busquedaOT$.next(filtro);
  }

  onFiltroProveedorFactura(event: any) {
    const filtro: string = event?.filter ?? event ?? '';
    if (filtro.length >= 3) {
      this.buscandoProveedoresFactura = true;
    }
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

  // ─── Órdenes de producción ───────────────────────────────────────────────────

  onSucursalChangeOT(idSucursal: string) {
    this.otForm.ordenTrabajo = '';
    this.ordenesProduccionOT = [];
    this.actualizarRutaOT();
    if (!idSucursal) return;

    this.cargandoOrdenes = true;
    this.masterService.getOrdenesProduccionPorSucursal(idSucursal).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.ordenesProduccionOT = res.data.map((o: any) => ({
            label: `${o.serie} - ${o.numero}`,
            value: o.idOrdenPro
          }));
        }
        this.cargandoOrdenes = false;
      },
      error: (err) => {
        console.error('Error cargando órdenes OT:', err);
        this.cargandoOrdenes = false;
      }
    });
  }

  onSucursalChangeFactura(idSucursal: string) {
    this.facturaForm.ordenTrabajo = '';
    this.ordenesProduccionFactura = [];
    this.actualizarRutaFactura();
    if (!idSucursal) return;

    this.cargandoOrdenes = true;
    this.masterService.getOrdenesProduccionPorSucursal(idSucursal).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.ordenesProduccionFactura = res.data.map((o: any) => ({
            label: `${o.serie} - ${o.numero}`,
            value: o.idOrdenPro
          }));
        }
        this.cargandoOrdenes = false;
      },
      error: (err) => {
        console.error('Error cargando órdenes Factura:', err);
        this.cargandoOrdenes = false;
      }
    });
  }

  // ─── Ruta S3 dinámica ───────────────────────────────────────────────────────

  actualizarRutaOT() {
    this.rutaGeneradaOT = this.construirRuta(
      this.otForm.fecha,
      this.otForm.sucursal,
      this.otForm.ordenTrabajo
    );
  }

  actualizarRutaFactura() {
    this.rutaGeneradaFactura = this.construirRuta(
      this.facturaForm.fecha,
      this.facturaForm.sucursal,
      this.facturaForm.ordenTrabajo
    );
  }

  construirRuta(fecha: string, sucursal: string, ot: string): string {
    if (!fecha && !sucursal) return '';

    const partes: string[] = [];

    if (fecha) {
      const d = new Date(fecha + 'T00:00:00');
      partes.push(String(d.getFullYear()));
    } else {
      partes.push('año');
    }

    partes.push(sucursal || 'sucursal');

    if (fecha) {
      const d = new Date(fecha + 'T00:00:00');
      partes.push(this.meses[d.getMonth()]);
      partes.push(String(d.getDate()).padStart(2, '0'));
    } else {
      partes.push('mes');
      partes.push('día');
    }

    if (ot) partes.push(ot);

    return partes.join('/') + '/';
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
    this.rutaGeneradaOT = '';
    this.rutaGeneradaFactura = '';

    if (tipo === 'OT') {
      this.otForm = this.initOtForm();
      this.ordenesProduccionOT = [];
      this.proveedoresOT = [];
      this.mostrarFormGasto = true;
    } else {
      this.facturaForm = this.initFacturaForm();
      this.ordenesProduccionFactura = [];
      this.proveedoresFactura = [];
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

  if (!fecha || !sucursal || !ordenTrabajo || !proveedorId || !monto || !serie.trim() || !numero.trim()) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Datos incompletos',
      detail: 'Complete todos los campos requeridos',
      life: 3000
    });
    return;
  }

  const ruta = this.construirRutaS3(fecha, sucursal, serie, numero);
  const usuario = this.cookieService.get('usuario') || '';

  this.cargando = true;
  this.apiService.insertarGastoSimple(
    fecha,
    sucursal,
    monto,
    usuario,
    ordenTrabajo,
    proveedorId,
    serie.trim().toUpperCase(),
    numero.trim(),
    ruta
  ).subscribe({
    next: (res: any) => {
      if (res?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Gasto registrado',
          detail: `Guardado en ${ruta}`,
          life: 3000
        });
        this.cerrarFormGasto();
        this.cargarRendiciones();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: res?.message || 'No se pudo guardar el gasto',
          life: 4000
        });
      }
      this.cargando = false;
    },
    error: (err) => {
      console.error('Error insertando gasto:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar el gasto',
        life: 4000
      });
      this.cargando = false;
    }
  });
}

construirRutaS3(fecha: string, idSucursal: string, serie: string, numero: string): string {
  const d = new Date(fecha + 'T00:00:00');
  const year = d.getFullYear();

  const mesesNombre = [
    'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
    'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
  ];
  const mes = mesesNombre[d.getMonth()];

  // Nombre de la sucursal (label) para la ruta
  const sucursalLabel = this.sucursales.find(s => s.value === idSucursal)?.label?.toUpperCase() || idSucursal;

  const fechaStr = this.formatearFecha(d); // YYYY-MM-DD

  // RUC del proveedor seleccionado
  const proveedorData = this.proveedoresOT.find(p => p.value === this.otForm.proveedorId)?.data;
  const ruc = proveedorData?.idCliente || proveedorData?.nrodocumento || this.otForm.proveedorId;

  const serieNumero = `${serie.trim().toUpperCase()}-${numero.trim()}`;

  return `${year}/${sucursalLabel}/${mes}/${fechaStr}/${ruc}_${serieNumero}`;
}

  cerrarFormGasto() {
    this.mostrarFormGasto = false;
    this.otForm = this.initOtForm();
    this.ordenesProduccionOT = [];
    this.proveedoresOT = [];
    this.rutaGeneradaOT = '';
  }

  // ─── Escanear Factura ──────────────────────────────────────────────────────

onFileSelectFactura(event: any) {
  // PrimeNG v19 advanced mode: los archivos nuevos vienen en event.currentFiles
  // pero también puede venir en event.files según versión
  const todosLosArchivos: File[] = event.currentFiles || event.files || [];
  
  // Detectar cuáles son nuevos (los que no están ya en facturaForm.archivos)
  const nombresExistentes = new Set(this.facturaForm.archivos.map(a => a.nombre));
  const archivosNuevos = todosLosArchivos.filter((f: File) => !nombresExistentes.has(f.name));

  if (archivosNuevos.length === 0) return;

  // Agregar previews
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

  // Escanear el primer archivo nuevo
  const archivoParaEscanear = archivosNuevos[0];
  const ext = archivoParaEscanear.name.split('.').pop()?.toLowerCase() || '';
  const esImagen = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  const esPdf = ext === 'pdf';

  if (!esImagen && !esPdf) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Formato no soportado',
      detail: 'Solo se pueden escanear imágenes o PDF',
      life: 3000
    });
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
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 }
      }
    : {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      };

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `Analiza este comprobante (factura, boleta o ticket) y extrae en JSON puro sin markdown ni explicaciones:
{"proveedor":"nombre del emisor","ruc":"RUC o nro documento emisor","monto":NUMERO,"serie":"ej F001","numero":"correlativo","fecha":"YYYY-MM-DD"}
Si no encuentras un campo usa null. Responde SOLO el JSON.`
          }
        ]
      }
    ]
  };

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(r => r.json())
    .then(data => {
      console.log('Respuesta IA factura:', data); // <-- para debug
      const bloque = data?.content?.find((c: any) => c.type === 'text');
      if (!bloque?.text) throw new Error('Sin texto en respuesta');

      const texto = bloque.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(texto);
      this.autocompletarFactura(parsed);

      this.messageService.add({
        severity: 'success',
        summary: 'Factura escaneada',
        detail: 'Revisa los datos extraídos y completa lo que falte.',
        life: 4000
      });
      this.escaneandoFactura = false;
    })
    .catch(err => {
      console.error('Error escaneo factura:', err);
      this.messageService.add({
        severity: 'warn',
        summary: 'No se pudo extraer',
        detail: 'Completa los datos manualmente.',
        life: 4000
      });
      this.escaneandoFactura = false;
    });
}



  private autocompletarFactura(datos: any) {
    if (datos.fecha) this.facturaForm.fecha = datos.fecha;
    if (datos.serie) this.facturaForm.serie = datos.serie.toUpperCase();
    if (datos.numero) this.facturaForm.numero = datos.numero;
    if (datos.monto !== null && datos.monto !== undefined) this.facturaForm.monto = parseFloat(datos.monto);

    // Para proveedor: si viene nombre, pre-buscar en API
    if (datos.proveedor) {
      this.facturaForm.proveedor = datos.proveedor;
      // Lanzar búsqueda automática para pre-cargar el select
      if (datos.proveedor.length >= 3) {
        this.buscandoProveedoresFactura = true;
        this.busquedaFactura$.next(datos.proveedor.substring(0, 20));
      }
    }

    this.actualizarRutaFactura();
  }

  eliminarArchivoFactura(archivo: ArchivoRendicion) {
    this.facturaForm.archivos = this.facturaForm.archivos.filter(a => a.id !== archivo.id);
  }

  guardarFactura() {
    const { fecha, sucursal, ordenTrabajo, proveedorId, monto, serie, numero } = this.facturaForm;

    if (!fecha || !sucursal || !ordenTrabajo || !proveedorId || !monto || !serie.trim() || !numero.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Complete todos los campos requeridos',
        life: 3000
      });
      return;
    }

    const ruta = this.construirRuta(fecha, sucursal, ordenTrabajo);
    console.log('Guardar Factura:', { ...this.facturaForm, rutaS3: ruta });

    // TODO: llamar API crear rendición + subir archivos a S3 en ruta

    this.messageService.add({
      severity: 'success',
      summary: 'Factura registrada',
      detail: `Guardado en ${ruta}`,
      life: 3000
    });

    this.cerrarFormFactura();
  }

  cerrarFormFactura() {
    this.mostrarFormFactura = false;
    this.facturaForm = this.initFacturaForm();
    this.ordenesProduccionFactura = [];
    this.proveedoresFactura = [];
    this.rutaGeneradaFactura = '';
    this.archivoFacturaPendiente = null;
    this.escaneandoFactura = false;
  }

  // ─── Detalle ────────────────────────────────────────────────────────────────

  verDetalle(rendicion: Rendicion) {
    this.rendicionSeleccionada = { ...rendicion };
    this.mostrarDetalle = true;
    // TODO: cargarArchivosDesdeS3(rendicion.ruta)
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
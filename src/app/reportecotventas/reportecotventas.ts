// reportecotventas.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Menu } from '../menu/menu';
import { Api } from '../services/api';
import { Master } from '../services/master';

export interface DetalleCotizacion {
  idProducto:     string;
  descripcion:    string;
  um:             string;
  cantidad:       number;
  precioUnitario: number;
  descuentoPct:   number;
  subTotal:       number;
  descuentoMonto: number;
  valor:          number;
  confirmado:     boolean;
}

export interface CabeceraCotizacion {
  idSucursal:       string;
  nombreSucursal:   string;
  moneda:           string;
  nombreCliente:    string;
  rucDni:           string;
  direccionCliente: string;
  telefonoCliente:  string;
  vendedor:         string;
  placa:            string;
  vin:              string;
  observaciones:    string;
  validezDias:      number;
  formaPago:        string;
}

@Component({
  selector: 'app-reportecotventas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    Menu
  ],
  templateUrl: './reportecotventas.html',
  styleUrls: ['./reportecotventas.css'],
  providers: [MessageService]
})
export class Reportecotventas implements OnInit {

  cabecera: CabeceraCotizacion = this.cabeceraVacia();

  sucursales: any[] = [];

  monedas = [
    { label: 'Soles (S/)',    value: 'PEN' },
    { label: 'Dólares (US$)', value: 'USD' },
  ];

  formasPago = [
    { label: 'Contado',         value: 'CONTADO'   },
    { label: 'Crédito 15 días', value: 'CREDITO15' },
    { label: 'Crédito 30 días', value: 'CREDITO30' },
  ];

  // Búsquedas cabecera
  buscandoCliente  = false;
  docCliente       = '';
  buscandoVehiculo = false;
  inputPlaca       = '';

  // Detalle — tabla editable inline
  detalle:    DetalleCotizacion[] = [];
  filaActiva: DetalleCotizacion   = this.filaVacia();

  igvPct    = 18;
  guardando = false;

  constructor(
    private messageService: MessageService,
    private apiService:     Api,
    private masterService:  Master
  ) {}

  ngOnInit() {
    this.cargarSucursales();
    this.cabecera.vendedor    = this.obtenerUsuarioActual();
    this.cabecera.validezDias = 10;
    this.cabecera.moneda      = 'PEN';
    this.cabecera.formaPago   = 'CONTADO';
  }

  // ── Vacíos ────────────────────────────────────────────────────────────────
  cabeceraVacia(): CabeceraCotizacion {
    return {
      idSucursal: '',          // FIX: string vacío en vez de null para que PrimeNG haga el binding correctamente
      nombreSucursal: '',
      moneda: 'PEN', nombreCliente: '', rucDni: '', direccionCliente: '',
      telefonoCliente: '', vendedor: '', placa: '', vin: '',
      observaciones: '', validezDias: 10, formaPago: 'CONTADO'
    };
  }

  filaVacia(): DetalleCotizacion {
    return {
      idProducto: '', descripcion: '', um: 'UND',
      cantidad: 1, precioUnitario: 0, descuentoPct: 0,
      subTotal: 0, descuentoMonto: 0, valor: 0, confirmado: false
    };
  }

obtenerUsuarioActual(): string {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('usuario='));
  if (!match) return '';
  try {
    const val = decodeURIComponent(match.split('=')[1]);
    const u = JSON.parse(val);
    return u.nombre ?? u.username ?? u.usuario ?? val;
  } catch {
    return decodeURIComponent(match.split('=')[1]);
  }
}
  // ── Getters ───────────────────────────────────────────────────────────────
  get simboloMoneda() { return this.cabecera.moneda === 'USD' ? 'US$' : 'S/'; }

  get fechaHoy() { return new Date().toLocaleDateString('es-PE'); }

  get fechaVencimiento() {
    const d = new Date();
    d.setDate(d.getDate() + (this.cabecera.validezDias ?? 10));
    return d.toLocaleDateString('es-PE');
  }

  // ── Sucursales ────────────────────────────────────────────────────────────
  cargarSucursales() {
    this.masterService.getSucursales().subscribe({
      next: (res: any) => {
        const data = res?.success && Array.isArray(res.data) ? res.data
          : Array.isArray(res) ? res : [];
this.sucursales = data.map((s: any) => ({
  label: (s.descripcion ?? '').trim(),
  value: String(s.idSucursal ?? '')   // ← era s.id ?? s.idsucursal → ambos undefined
}));
        // FIX: forzar re-evaluación del binding después de cargar opciones
        this.cabecera.idSucursal = '';
      },
      error: () => {}
    });
  }
  onSucursalChange() {
    // FIX: comparar como strings para evitar mismatch número vs string
    const sel = this.sucursales.find(
      s => String(s.value) === String(this.cabecera.idSucursal)
    );
    this.cabecera.nombreSucursal = sel?.label ?? '';
  }

  // ── Cliente (Factiliza) ───────────────────────────────────────────────────
  buscarCliente() {
    const doc = (this.docCliente ?? '').trim();
    if (doc.length !== 8 && doc.length !== 11) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso',
        detail: 'Ingrese DNI (8) o RUC (11)', life: 3000 });
      return;
    }
    this.buscandoCliente = true;
    this.masterService.factiliza(doc).subscribe({
      next: (res: any) => {
        this.buscandoCliente = false;
        if (res?.success && res?.data) {
          const d = res.data;
          this.cabecera.rucDni           = doc;
          this.cabecera.nombreCliente    = doc.length === 11
            ? (d.razon_social ?? d.nombre ?? '')
            : `${d.nombres ?? ''} ${d.apellido_paterno ?? ''} ${d.apellido_materno ?? ''}`.trim();
          this.cabecera.direccionCliente = d.direccion ?? d.domicilio_fiscal ?? '';
          this.cabecera.telefonoCliente  = d.telefono ?? '';
        } else {
          this.messageService.add({ severity: 'warn', summary: 'No encontrado',
            detail: 'Documento no hallado en Factiliza', life: 3000 });
        }
      },
      error: () => {
        this.buscandoCliente = false;
        this.messageService.add({ severity: 'error', summary: 'Error',
          detail: 'Error al consultar Factiliza', life: 3000 });
      }
    });
  }

  // ── Vehículo ──────────────────────────────────────────────────────────────
  buscarVehiculo() {
    const input = (this.inputPlaca ?? '').trim().toUpperCase();
    if (!input) return;
    this.buscandoVehiculo = true;
    this.masterService.getCarPorVin(input).subscribe({
      next: (res: any) => {
        this.buscandoVehiculo = false;
        const d = res?.data ?? res;
        this.cabecera.placa = d?.placa ?? input;
        this.cabecera.vin   = d?.vin   ?? d?.nroChasis ?? input;
        if (!d) this.messageService.add({ severity: 'info', summary: 'Info',
          detail: 'Placa registrada manualmente', life: 2000 });
      },
      error: () => {
        this.buscandoVehiculo = false;
        this.cabecera.placa = input;
        this.messageService.add({ severity: 'info', summary: 'Info',
          detail: 'Placa registrada manualmente', life: 2000 });
      }
    });
  }

  // ── Detalle inline ────────────────────────────────────────────────────────
  recalc(fila: DetalleCotizacion) {
    fila.subTotal       = +(fila.cantidad * fila.precioUnitario).toFixed(6);
    fila.descuentoMonto = +(fila.subTotal * fila.descuentoPct / 100).toFixed(6);
    fila.valor          = +(fila.subTotal - fila.descuentoMonto).toFixed(6);
  }

  confirmarFila() {
    if (!this.filaActiva.descripcion) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso',
        detail: 'Ingrese la descripción del producto', life: 2000 });
      return;
    }
    this.recalc(this.filaActiva);
    this.filaActiva.confirmado = true;
    this.detalle = [...this.detalle, { ...this.filaActiva }];
    this.filaActiva = this.filaVacia();
  }

  editarFila(index: number) {
    this.detalle[index].confirmado = false;
    this.detalle = [...this.detalle];
  }

  confirmarEdicion(index: number) {
    this.recalc(this.detalle[index]);
    this.detalle[index].confirmado = true;
    this.detalle = [...this.detalle];
  }

  eliminarFila(index: number) {
    this.detalle = this.detalle.filter((_, i) => i !== index);
  }

  // ── Totales ───────────────────────────────────────────────────────────────
  get totalSubTotal()   { return this.detalle.reduce((s, f) => s + f.subTotal, 0); }
  get totalDescuento()  { return this.detalle.reduce((s, f) => s + f.descuentoMonto, 0); }
  get totalValorVenta() { return this.detalle.reduce((s, f) => s + f.valor, 0); }
  get totalIgv()        { return +(this.totalValorVenta * this.igvPct / 100).toFixed(2); }
  get totalGeneral()    { return +(this.totalValorVenta + this.totalIgv).toFixed(2); }

  // ── Limpiar ───────────────────────────────────────────────────────────────
  limpiarCotizacion() {
    this.cabecera             = this.cabeceraVacia();
    this.cabecera.vendedor    = this.obtenerUsuarioActual();
    this.cabecera.moneda      = 'PEN';
    this.cabecera.formaPago   = 'CONTADO';
    this.cabecera.validezDias = 10;
    this.detalle              = [];
    this.filaActiva           = this.filaVacia();
    this.docCliente           = '';
    this.inputPlaca           = '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GENERAR PDF
  // ══════════════════════════════════════════════════════════════════════════
  async generarCotizacionPDF(): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const page   = pdfDoc.addPage(PageSizes.A4);
    const { width: W, height: H } = page.getSize();

    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const mm  = (v: number) => v * 2.8346;
    const ML  = mm(20);
    const MR  = W - mm(20);
    const BLK  = rgb(0, 0, 0);
    const GRAY = rgb(0.45, 0.45, 0.45);

    const drawText = (
      text: string, x: number, y: number,
      opts: { size?: number; bold?: boolean; color?: any; align?: 'left'|'right'|'center' } = {}
    ) => {
      const { size = 9, bold = false, color = BLK, align = 'left' } = opts;
      const f  = bold ? fontBold : font;
      const tw = f.widthOfTextAtSize(text, size);
      let dx = x;
      if (align === 'right')  dx = x - tw;
      if (align === 'center') dx = x - tw / 2;
      page.drawText(text, { x: dx, y, size, font: f, color });
    };

    const hline = (y: number, x1 = ML, x2 = MR, lw = 0.5) =>
      page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: lw, color: BLK });

    const cab = this.cabecera;
    const now = new Date();
    const fmtDate = (d: Date) => d.toLocaleString('es-PE',
      { day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const validezD = new Date(now);
    validezD.setDate(validezD.getDate() + (cab.validezDias ?? 10));
    const monedaLabel = cab.moneda === 'USD' ? 'DOLARES AMERICANOS' : 'SOLES';
    const nroCot = `COV ${cab.idSucursal || '0001'} - ${String(Date.now()).slice(-7)}`;

    // ── Header ────────────────────────────────────────────────────────────
    let y = H - mm(13);
    page.drawRectangle({ x: ML, y: y - mm(18), width: mm(45), height: mm(22),
      borderColor: BLK, borderWidth: 1.5, color: rgb(1,1,1) });
    drawText('PERUMOTOR', ML + mm(22.5), y - mm(7),  { size: 13, bold: true, align: 'center' });
    drawText('Juntos para toda la vida', ML + mm(22.5), y - mm(13),
      { size: 7, align: 'center', color: GRAY });
    ['Mitsubishi','FUSO','VW','Chevrolet','Audi','Hyundai'].forEach((m, i) =>
      drawText(m, ML + mm(50) + i * mm(23), y - mm(7), { size: 7, bold: true }));

    y -= mm(27);
    drawText('Cotización', W / 2, y, { size: 16, bold: true, align: 'center' });
    y -= mm(6);
    hline(y, ML, MR, 0.8);

    // ── Cabecera bipartita ────────────────────────────────────────────────
    y -= mm(5);
    const col2 = ML + mm(32);
    const col3 = W / 2 + mm(5);

    const leftRows: [string, string][] = [
      ['Cotización:',  nroCot],
      ['Fecha Alta:',  fmtDate(now)],
      ['Fecha Validez:', fmtDate(validezD)],
      ['Vendedor:',    cab.vendedor],
      ['Placa:',       cab.placa],
      ['Ref. Cliente:', ''],
    ];
    let yL = y;
    leftRows.forEach(([label, val]) => {
      drawText(label, ML,   yL, { size: 8, bold: true });
      drawText(val,   col2, yL, { size: 8 });
      yL -= mm(5);
    });

    let yR = y;
    drawText(cab.nombreCliente, col3, yR, { size: 9, bold: true });
    yR -= mm(5);
    const dir = cab.direccionCliente ?? '';
    for (let i = 0; i < dir.length; i += 52) {
      drawText(dir.substring(i, i + 52), col3, yR, { size: 8 });
      yR -= mm(4.5);
    }
    yR -= mm(1);
    drawText('Teléfono:',         col3,          yR, { size: 8, bold: true });
    drawText(cab.telefonoCliente, col3 + mm(18), yR, { size: 8 });
    yR -= mm(5);
    drawText('Expresado en:',     col3,          yR, { size: 8, bold: true });
    drawText(monedaLabel,         col3 + mm(22), yR, { size: 8 });

    // ── Tabla productos ───────────────────────────────────────────────────
    let yT = Math.min(yL, yR) - mm(8);
    hline(yT, ML, MR, 0.8);
    yT -= mm(5);

    const C_CANT  = ML  + mm(96);
    const C_PVTA  = ML  + mm(116);
    const C_PDTO  = ML  + mm(136);

    drawText('Descripción', ML,     yT, { size: 8, bold: true });
    drawText('Cantidad',    C_CANT, yT, { size: 8, bold: true, align: 'right' });
    drawText('P. Venta',    C_PVTA, yT, { size: 8, bold: true, align: 'right' });
    drawText('% Dto.',      C_PDTO, yT, { size: 8, bold: true, align: 'right' });
    drawText('Valor',       MR,     yT, { size: 8, bold: true, align: 'right' });
    yT -= mm(2);
    hline(yT, ML, MR, 0.8);

    this.detalle.forEach(fila => {
      yT -= mm(5.5);
      const desc = fila.descripcion.length > 55 ? fila.descripcion.substring(0,52)+'...' : fila.descripcion;
      drawText(desc,                           ML,     yT, { size: 8 });
      drawText(fila.cantidad.toFixed(2),       C_CANT, yT, { size: 8, align: 'right' });
      drawText(fila.precioUnitario.toFixed(2), C_PVTA, yT, { size: 8, align: 'right' });
      drawText(fila.descuentoPct.toFixed(2),   C_PDTO, yT, { size: 8, align: 'right' });
      drawText(fila.valor.toFixed(2),          MR,     yT, { size: 8, align: 'right' });
    });
    yT -= mm(4);
    hline(yT, ML, MR, 0.3);

    // ── Totales ───────────────────────────────────────────────────────────
    yT -= mm(6);
    const T_SUBT  = ML  + mm(70);
    const T_IGVP  = ML  + mm(105);
    const T_IGVM  = ML  + mm(130);

    drawText('Sub Total',        T_SUBT, yT, { size: 8, bold: true, align: 'center' });
    drawText('% IGV',            T_IGVP, yT, { size: 8, bold: true, align: 'center' });
    drawText('importe IGV',      T_IGVM, yT, { size: 8, bold: true, align: 'center' });
    drawText('Total Cotización', MR,     yT, { size: 8, bold: true, align: 'right'  });
    yT -= mm(2);
    hline(yT, ML, MR, 0.5);
    yT -= mm(5);
    drawText(this.totalValorVenta.toFixed(2), T_SUBT, yT, { size: 9, bold: true, align: 'center' });
    drawText(this.igvPct.toFixed(2),          T_IGVP, yT, { size: 9, bold: true, align: 'center' });
    drawText(this.totalIgv.toFixed(2),        T_IGVM, yT, { size: 9, bold: true, align: 'center' });
    drawText(this.totalGeneral.toFixed(2),    MR,     yT, { size: 9, bold: true, align: 'right'  });
    yT -= mm(2);
    hline(yT, ML, MR, 0.5);
    yT -= mm(8);
    drawText(`Total cotización: ${this.totalEnLetras()} ${monedaLabel.toLowerCase()}`,
      W / 2, yT, { size: 8, bold: true, align: 'center' });

    // ── Descarga ──────────────────────────────────────────────────────────
    const bytes = await pdfDoc.save();
    const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = `Cotizacion_${nroCot.replace(/\s/g,'_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private totalEnLetras(): string {
    const n       = this.totalGeneral;
    const entero  = Math.floor(n);
    const decimal = Math.round((n - entero) * 100);
    const unidades = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
      'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
    const decenas  = ['','','veinte','treinta','cuarenta','cincuenta',
      'sesenta','setenta','ochenta','noventa'];
    const centenas = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos',
      'seiscientos','setecientos','ochocientos','novecientos'];
    const grupos = (num: number): string => {
      if (num === 0) return 'cero'; if (num === 100) return 'cien';
      let r = '';
      if (num >= 100) { r += centenas[Math.floor(num/100)] + ' '; num %= 100; }
      if (num >= 20)  { r += decenas[Math.floor(num/10)];  num %= 10; if (num) r += ' y '; }
      if (num > 0)    { r += unidades[num]; }
      return r.trim();
    };
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    let texto = miles === 1 ? 'mil ' : miles > 1 ? grupos(miles) + ' mil ' : '';
    texto += grupos(resto);
    return `${texto} y ${String(decimal).padStart(2,'0')}/100`;
  }
}
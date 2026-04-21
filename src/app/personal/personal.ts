// personal.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Menu } from '../menu/menu';
import { Api } from '../services/api';

interface PersonalNisira {
  codigo: string;
  nombres: string;
  apellido_Paterno: string;
  apellido_Materno: string;
  dni: string;
  fecha_Nacimiento: string;
  sexo: string;
  talla_Polo: string;
  talla_Pantalon: string;
  talla_Zapato: string;
  direccion_Via: string;
  numero: string;
  interior: string;
  manzana: string;
  lote: string;
  block: string;
  etapa: string;
  kilometro: string;
  zona: string;
  referencia: string;
  telefono1: string;
  telefono2: string;
  celular: string;
  email: string;
  estado_Civil: string;
  grado_Instruccion: string;
  nro_Hijos: string;
  grupo_Sanguineo: string;
  alergias: string;
  medicinas: string;
  cuenta_Sueldo: string;
  banco_Sueldo: string;
  cuenta_Cts: string;
  banco_Cts: string;
  total_Registros: number;
  fila: number;
}

interface EditarPersonalRequest {
  Nombres: string;
  A_Paterno: string;
  A_Materno: string;
  NroDocumento: string;
  Fecha_Nacimiento: string | null;
  Sexo: string;
  Telefono: string;
  Telefono2: string;
  Celular: string;
  Email: string;
  Descripcion_Via: string;
  Direccion_Numero: number | null;
  Direccion_Interior: string;
  Direccion_Manzana: string;
  Direccion_Lote: string;
  Direccion_Block: string;
  Direccion_Etapa: string;
  Direccion_Kilometro: string;
  Descripcion_Zona: string;
  Direccion_Referencia: string;
}

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    ToastModule,
    TooltipModule,
    Menu
  ],
  templateUrl: './personal.html',
  styleUrls: ['./personal.css'],
  providers: [MessageService]
})
export class Personal implements OnInit {
  personal: PersonalNisira[] = [];
  cargando = false;
  totalRegistros = 0;

  filtroDni = '';
  filtroNombres = '';
  filtroApellidos = '';
  pagina = 1;
  tamanio = 20;

  mostrarFormulario = false;
  personalSeleccionado: PersonalNisira | null = null;

  form: EditarPersonalRequest = this.formularioVacio();

  sexos: any[] = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' }
  ];

  constructor(
    private messageService: MessageService,
    private apiService: Api
  ) {}

  ngOnInit() {
    this.cargarPersonal();
  }

  formularioVacio(): EditarPersonalRequest {
    return {
      Nombres: '',
      A_Paterno: '',
      A_Materno: '',
      NroDocumento: '',
      Fecha_Nacimiento: null,
      Sexo: '',
      Telefono: '',
      Telefono2: '',
      Celular: '',
      Email: '',
      Descripcion_Via: '',
      Direccion_Numero: null,
      Direccion_Interior: '',
      Direccion_Manzana: '',
      Direccion_Lote: '',
      Direccion_Block: '',
      Direccion_Etapa: '',
      Direccion_Kilometro: '',
      Descripcion_Zona: '',
      Direccion_Referencia: ''
    };
  }

  cargarPersonal() {
    this.cargando = true;
    this.apiService.listarPersonal(
      this.filtroDni,
      this.filtroNombres,
      this.filtroApellidos,
      this.pagina,
      this.tamanio
    ).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response?.success && response?.data) {
          this.personal = response.data;
          this.totalRegistros = response.data[0]?.total_Registros ?? response.data.length;
        } else {
          this.personal = [];
          this.totalRegistros = 0;
        }
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el listado de personal',
          life: 3000
        });
      }
    });
  }

  aplicarFiltros() {
    this.pagina = 1;
    this.cargarPersonal();
  }

  limpiarFiltros() {
    this.filtroDni = '';
    this.filtroNombres = '';
    this.filtroApellidos = '';
    this.pagina = 1;
    this.cargarPersonal();
  }

  onPage(event: any) {
    this.pagina = Math.floor(event.first / event.rows) + 1;
    this.tamanio = event.rows;
    this.cargarPersonal();
  }

  abrirEditar(item: PersonalNisira) {
    this.personalSeleccionado = item;
    this.form = {
      Nombres: item.nombres ?? '',
      A_Paterno: item.apellido_Paterno ?? '',
      A_Materno: item.apellido_Materno ?? '',
      NroDocumento: item.dni ?? '',
      Fecha_Nacimiento: this.convertirFechaParaInput(item.fecha_Nacimiento),
      Sexo: item.sexo ?? '',
      Telefono: item.telefono1 ?? '',
      Telefono2: item.telefono2 ?? '',
      Celular: item.celular ?? '',
      Email: item.email ?? '',
      Descripcion_Via: item.direccion_Via ?? '',
      Direccion_Numero: item.numero && item.numero !== '0' ? parseFloat(item.numero) : null,
      Direccion_Interior: item.interior?.trim() ?? '',
      Direccion_Manzana: item.manzana?.trim() ?? '',
      Direccion_Lote: item.lote?.trim() ?? '',
      Direccion_Block: item.block?.trim() ?? '',
      Direccion_Etapa: item.etapa?.trim() ?? '',
      Direccion_Kilometro: item.kilometro?.trim() ?? '',
      Descripcion_Zona: item.zona?.trim() ?? '',
      Direccion_Referencia: item.referencia?.trim() ?? ''
    };
    this.mostrarFormulario = true;
  }

  // Convierte "dd/MM/yyyy" → "yyyy-MM-dd" para el input date
  private convertirFechaParaInput(fecha: string): string | null {
    if (!fecha) return null;
    const partes = fecha.split('/');
    if (partes.length !== 3) return null;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.personalSeleccionado = null;
    this.form = this.formularioVacio();
  }

  guardarPersonal() {
    if (!this.personalSeleccionado) return;

    this.cargando = true;
    this.apiService.editarPersonal(this.personalSeleccionado.codigo, this.form).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Los datos del personal fueron actualizados',
            life: 3000
          });
          this.cerrarFormulario();
          this.cargarPersonal();
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: response?.message ?? 'No se pudo actualizar el registro',
            life: 3000
          });
        }
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Ocurrió un error al guardar los datos',
          life: 3000
        });
      }
    });
  }

  getNombreCompleto(item: PersonalNisira): string {
    return `${item.nombres ?? ''} ${item.apellido_Paterno ?? ''} ${item.apellido_Materno ?? ''}`.trim();
  }

  async generarFicha(item: PersonalNisira) {
    const pdfBytes = await fetch('ficha-personal.pdf').then(r => r.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fs = 8;
    const black = rgb(0, 0, 0);

    // Convierte coordenada Y de pdfplumber (top-left) a pdf-lib (bottom-left)
    const y = (pdfY: number) => height - pdfY;

    const draw = (text: string, x: number, pdfY: number, bold = false) => {
      const t = (text ?? '').trim();
      if (!t) return;
      page.drawText(t, { x, y: y(pdfY), size: fs, font: bold ? fontBold : font, color: black });
    };

    // ── 1. IDENTIFICACIÓN PERSONAL ─────────────────────────────────────────
    draw(item.apellido_Paterno,  56, 190);
    draw(item.apellido_Materno, 193, 190);
    draw(item.nombres,          337, 190);

    draw(item.dni,                                           56, 212);
    draw(item.fecha_Nacimiento,                             193, 212);
    draw(item.sexo === 'M' ? 'Masculino' : 'Femenino',     337, 212);

    // ── 2. TALLAS ──────────────────────────────────────────────────────────
    draw(item.talla_Polo,     163, 255);
    draw(item.talla_Pantalon, 237, 255);
    draw(item.talla_Zapato,   437, 255);

    // ── 3. DIRECCIÓN ───────────────────────────────────────────────────────
    draw(item.direccion_Via, 56, 300);
    draw(item.numero !== '0' ? item.numero : '', 193, 300);
    draw(item.interior,      303, 300);
    draw(item.zona,          398, 300);
    // Distrito / Provincia / Departamento no vienen en la entidad
    draw(item.referencia, 150, 344);

    // ── 4. TELÉFONOS ────────────────────────────────────────────────────────
    draw(item.telefono1,  56, 388);
    draw(item.celular,   248, 388);
    draw(item.email,     383, 388);

    // ── 5. ESTADO CIVIL ─────────────────────────────────────────────────────
    // Coordenada X del centro entre "(" y ")" de cada opción
    const estadoCivil = item.estado_Civil?.trim().toUpperCase() ?? '';
    const checkEstado: Record<string, number> = {
      'SOLTERO': 99,  'SOLTERA': 99,
      'CONCUBINO': 213, 'CONCUBINA': 213,
      'CASADO': 278,  'CASADA': 278,
      'DIVORCIADO': 372, 'DIVORCIADA': 372,
      'VIUDO': 448,   'VIUDA': 448,
    };
    for (const [key, xCheck] of Object.entries(checkEstado)) {
      if (estadoCivil.includes(key)) {
        draw('X', xCheck, 416, true);
        break;
      }
    }

    // ── 6. GRADO DE INSTRUCCIÓN ─────────────────────────────────────────────
    const grado = item.grado_Instruccion?.trim().toUpperCase() ?? '';
    // Fila 1
    const checkGrado1: Record<string, number> = {
      'SECUNDARIA COMPLETA': 139,
      'TECNICO COMPLETO': 273,   'TÉCNICO COMPLETO': 273,
      'UNIVERSITARIO COMPLETO': 393,
      'TITULADO': 492,
    };
    // Fila 2
    const checkGrado2: Record<string, number> = {
      'SECUNDARIA INCOMPLETA': 148, 'SECUNDARIA IMCOMPLETA': 148,
      'TECNICO INCOMPLETO': 278,    'TÉCNICO INCOMPLETO': 278,
      'UNIVERSITARIO INCOMPLETO': 403, 'UNIVERSITARIO IMCOMPLETO': 403,
      'MAGISTER': 490,
    };
    let checkFila2 = false;
    for (const [key, xCheck] of Object.entries(checkGrado2)) {
      if (grado.includes(key)) { draw('X', xCheck, 460, true); checkFila2 = true; break; }
    }
    if (!checkFila2) {
      for (const [key, xCheck] of Object.entries(checkGrado1)) {
        if (grado.includes(key)) { draw('X', xCheck, 446, true); break; }
      }
    }

    // ── 9. OTROS ────────────────────────────────────────────────────────────
    draw(item.grupo_Sanguineo, 56,  614);
    draw(item.alergias,       260,  614);
    draw(item.medicinas,      386,  614);

    // ── 10. CUENTA SUELDO ───────────────────────────────────────────────────
    draw(item.cuenta_Sueldo, 140, 627);
    draw(item.banco_Sueldo,  359, 627);

    // ── 11. CUENTA CTS ──────────────────────────────────────────────────────
    draw(item.cuenta_Cts, 178, 641);

    // Descarga
    const filled = await pdfDoc.save();
    const blob = new Blob([filled.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha_${item.apellido_Paterno}_${item.nombres}.pdf`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }
}

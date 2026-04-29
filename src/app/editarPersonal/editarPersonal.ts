import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Menu } from '../menu/menu';
import { Api } from '../services/api';
import { Auth } from '../services/auth';
import { Master } from '../services/master';
import * as L from 'leaflet';

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
  direccion_Via2: string;
  idUbigeo: string;
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
  Descripcion_Via2: string;
  IdUbigeo: string;
  Direccion_Numero: number | null;
  Direccion_Interior: string;
  Direccion_Manzana: string;
  Direccion_Lote: string;
  Direccion_Block: string;
  Direccion_Etapa: string;
  Direccion_Kilometro: string;
  Descripcion_Zona: string;
  Direccion_Referencia: string;
  Estado_Civil: string;
  Grado_Instruccion: string;
  Nro_Hijos: string;
  IdBanco: string;
  Cuenta_Cts: string;
}

interface Beneficiario {
  item: string;
  tipoDocumento: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: string;
  buscando: boolean;
  guardando: boolean;
  guardado: boolean;
  editando: boolean;
  error: string;
}

interface BeneficiarioRequest {
  IdDocIdentidad: string;
  Nombres: string;
  A_Paterno: string;
  A_Materno: string;
  NroDocumento: string;
  Fecha_Nacimiento: string | null;
  Sexo: string;
}

interface ArchivoPersonal {
  nombre: string;
  url: string;
  esImagen: boolean;
}

interface Contacto {
  nombre: string;
  telefono: string;
  parentesco: string;
}

interface VariablePersonal {
  idcodigogeneral: string;
  idvariable: string;
  valor: string;
}

@Component({
  selector: 'app-personal',
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
  templateUrl: './editarPersonal.html',
  styleUrls: ['./editarPersonal.css'],
  providers: [MessageService]
})
export class EditarPersonal implements OnInit, OnDestroy {
  cargandoPagina = false;
  sinAcceso = false;
  cargando = false;

  personalSeleccionado: PersonalNisira | null = null;
  form: EditarPersonalRequest = this.formularioVacio();

  // ── Catálogos ────────────────────────────────────────────────────────────
  sexos: any[] = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino',  value: 'F' }
  ];

  estadosCiviles: any[] = [
    { label: 'CASADO',      value: 'CA' },
    { label: 'CONVIVIENTE', value: 'CO' },
    { label: 'DIVORCIADO',  value: 'DI' },
    { label: 'SOLTERO',     value: 'SO' },
    { label: 'VIUDO',       value: 'VI' },
  ];

  nivelesEstudio: any[] = [
    { label: 'SIN EDUCACIÓN FORMAL',                                          value: '001' },
    { label: 'EDUCACIÓN ESPECIAL INCOMPLETA',                                 value: '002' },
    { label: 'EDUCACIÓN ESPECIAL COMPLETA',                                   value: '003' },
    { label: 'EDUCACIÓN PRIMARIA INCOMPLETA',                                 value: '004' },
    { label: 'EDUCACIÓN PRIMARIA COMPLETA',                                   value: '005' },
    { label: 'EDUCACIÓN SECUNDARIA INCOMPLETA',                               value: '006' },
    { label: 'EDUCACIÓN SECUNDARIA COMPLETA',                                 value: '007' },
    { label: 'EDUCACIÓN TÉCNICA INCOMPLETA',                                  value: '008' },
    { label: 'EDUCACIÓN TÉCNICA COMPLETA',                                    value: '009' },
    { label: 'EDUCACIÓN SUPERIOR (INSTITUTO SUPERIOR, ETC) INCOMPLETA',       value: '010' },
    { label: 'EDUCACIÓN SUPERIOR (INSTITUTO SUPERIOR, ETC) COMPLETA',         value: '011' },
    { label: 'EDUCACIÓN UNIVERSITARIA INCOMPLETA',                            value: '012' },
    { label: 'EDUCACIÓN UNIVERSITARIA COMPLETA',                              value: '013' },
    { label: 'GRADO DE BACHILLER',                                            value: '014' },
    { label: 'TITULADO',                                                      value: '015' },
    { label: 'ESTUDIOS DE MAESTRÍA INCOMPLETA',                               value: '016' },
    { label: 'ESTUDIOS DE MAESTRÍA COMPLETA',                                 value: '017' },
    { label: 'GRADO DE MAESTRÍA',                                             value: '018' },
    { label: 'ESTUDIOS DE DOCTORADO INCOMPLETO',                              value: '019' },
    { label: 'ESTUDIOS DE DOCTORADO COMPLETO',                                value: '020' },
    { label: 'GRADO DE DOCTOR',                                               value: '021' },
    { label: 'OTROS',                                                         value: '022' },
  ];

  bancos: any[] = [];

  // ── Ubigeo ────────────────────────────────────────────────────────────────
  departamentos: any[] = [];
  provincias: any[] = [];
  distritos: any[] = [];
  ubigeos: any[] = [];
  ubigeoSeleccionado = '';
  depSeleccionado = '';
  provSeleccionada = '';
  distSeleccionado = '';
  cargandoDep = false;
  cargandoProv = false;
  cargandoDist = false;
  cargandoUbigeos = false;

  // ── Variables médicas ─────────────────────────────────────────────────────
  varGrupoSanguineo = '';
  varAlergias = '';
  varMedicinas = '';
  cargandoVariables = false;

  // ── Contactos de emergencia ───────────────────────────────────────────────
  contacto1: Contacto = { nombre: '', telefono: '', parentesco: '' };
  contacto2: Contacto = { nombre: '', telefono: '', parentesco: '' };

  // ── Beneficiarios ────────────────────────────────────────────────────────
  tiposDocumentoBeneficiario = [
    { label: 'DNI', value: '01' },
    { label: 'Carné de extranjería', value: '04' }
  ];
  beneficiarios: Beneficiario[] = [];
  nuevoBeneficiarioDocumento = '';
  nuevoBeneficiarioTipoDocumento = '01';
  cargandoBeneficiarios = false;

  // ── Galería ──────────────────────────────────────────────────────────────
  archivos: ArchivoPersonal[] = [];
  cargandoArchivos = false;
  subiendoArchivo = false;
  imagenVistaPrevia: string | null = null;
  referenciaTexto = '';
  referenciaLatitud: number | null = null;
  referenciaLongitud: number | null = null;
  cargandoMapaReferencia = false;
  errorMapaReferencia = '';

  private mapaReferencia: L.Map | null = null;
  private markerReferencia: L.Marker | null = null;
  private referenciaTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly iconoMapa = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  constructor(
    private messageService: MessageService,
    private apiService: Api,
    private masterService: Master,
    private authService: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    const usuario = this.getCookie('usuario');
    if (usuario) {
      this.cargarPersonalPorDocumento(usuario);
    } else {
      this.sinAcceso = true;
    }
    this.cargarBancos();
    this.cargarUbigeos();
  }

  ngOnDestroy(): void {
    if (this.referenciaTimeout) {
      clearTimeout(this.referenciaTimeout);
    }
    if (this.mapaReferencia) {
      this.mapaReferencia.remove();
      this.mapaReferencia = null;
    }
  }

  // ── Cookie ────────────────────────────────────────────────────────────────
  private getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? '';
    return '';
  }

  // ── Carga inicial ─────────────────────────────────────────────────────────
  cargarPersonalPorDocumento(documento: string) {
    this.cargandoPagina = true;
    this.apiService.listarPersonal(documento, '', '', 1, 1).subscribe({
      next: (response) => {
        this.cargandoPagina = false;
        if (response?.success && response?.data?.length > 0) {
          this.abrirEditar(response.data[0]);
        } else {
          this.personalSeleccionado = null;
        }
      },
      error: () => {
        this.cargandoPagina = false;
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: 'No se pudo cargar los datos del personal', life: 3000
        });
      }
    });
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  formularioVacio(): EditarPersonalRequest {
    return {
      Nombres: '', A_Paterno: '', A_Materno: '', NroDocumento: '',
      Fecha_Nacimiento: null, Sexo: '', Telefono: '', Telefono2: '',
      Celular: '', Email: '',
      Descripcion_Via: '', Descripcion_Via2: '', IdUbigeo: '',
      Direccion_Numero: null, Direccion_Interior: '', Direccion_Manzana: '',
      Direccion_Lote: '', Direccion_Block: '', Direccion_Etapa: '',
      Direccion_Kilometro: '', Descripcion_Zona: '', Direccion_Referencia: '',
      Estado_Civil: '', Grado_Instruccion: '', Nro_Hijos: '',
      IdBanco: '', Cuenta_Cts: ''
    };
  }

  abrirEditar(item: PersonalNisira) {
    this.personalSeleccionado = item;
    this.beneficiarios = [];
    this.nuevoBeneficiarioDocumento = '';
    this.nuevoBeneficiarioTipoDocumento = '01';
    this.archivos = [];
    this.imagenVistaPrevia = null;
    this.contacto1 = { nombre: '', telefono: '', parentesco: '' };
    this.contacto2 = { nombre: '', telefono: '', parentesco: '' };
    this.varGrupoSanguineo = '';
    this.varAlergias = '';
    this.varMedicinas = '';
    this.resetearReferenciaMapa();

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
      Descripcion_Via2: item.direccion_Via2 ?? '',
      IdUbigeo: item.idUbigeo ?? '',
      Direccion_Numero: item.numero && item.numero !== '0' ? parseFloat(item.numero) : null,
      Direccion_Interior: item.interior?.trim() ?? '',
      Direccion_Manzana: item.manzana?.trim() ?? '',
      Direccion_Lote: item.lote?.trim() ?? '',
      Direccion_Block: item.block?.trim() ?? '',
      Direccion_Etapa: item.etapa?.trim() ?? '',
      Direccion_Kilometro: item.kilometro?.trim() ?? '',
      Descripcion_Zona: item.zona?.trim() ?? '',
      Direccion_Referencia: item.referencia?.trim() ?? '',
      Estado_Civil: this.resolverEstadoCivil(item.estado_Civil),
      Grado_Instruccion: this.resolverGradoInstruccion(item.grado_Instruccion),
      Nro_Hijos: item.nro_Hijos ?? '',
      IdBanco: item.banco_Cts?.trim() ?? '',
      Cuenta_Cts: item.cuenta_Cts?.trim() ?? ''
    };

    const referenciaGuardada = this.descomponerReferenciaGuardada(item.referencia?.trim() ?? '');
    this.referenciaTexto = referenciaGuardada.texto;
    this.referenciaLatitud = referenciaGuardada.latitud;
    this.referenciaLongitud = referenciaGuardada.longitud;
    this.form.Direccion_Referencia = referenciaGuardada.texto;
    this.ubigeoSeleccionado = item.idUbigeo ?? '';

    this.cargarBeneficiarios(item.codigo);
    this.cargarArchivos(item.codigo);
    this.cargarVariablesPersonal(item.dni ?? '');
    setTimeout(() => this.configurarMapaReferenciaInicial(), 0);
  }

  private convertirFechaParaInput(fecha: string): string | null {
    if (!fecha) return null;
    const partes = fecha.split('/');
    if (partes.length !== 3) return null;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  // ── Resolvers de catálogos ────────────────────────────────────────────────
  private resolverEstadoCivil(val: string): string {
    const v = (val ?? '').trim().toUpperCase();
    if (!v) return '';
    if (['CA', 'CO', 'DI', 'SO', 'VI'].includes(v)) return v;
    if (v.includes('CASAD')) return 'CA';
    if (v.includes('CONVIV')) return 'CO';
    if (v.includes('DIVORC')) return 'DI';
    if (v.includes('SOLTER')) return 'SO';
    if (v.includes('VIUD')) return 'VI';
    return '';
  }

  private resolverGradoInstruccion(val: string): string {
    const v = (val ?? '').trim().toUpperCase();
    if (!v) return '';
    if (/^\d{3}$/.test(v)) return v;
    if (v.includes('SIN EDUCACI')) return '001';
    if (v.includes('ESPECIAL') && v.includes('INCOMPLETA')) return '002';
    if (v.includes('ESPECIAL') && v.includes('COMPLETA')) return '003';
    if (v.includes('PRIMARIA') && v.includes('INCOMPLETA')) return '004';
    if (v.includes('PRIMARIA') && v.includes('COMPLETA')) return '005';
    if (v.includes('SECUNDARIA') && v.includes('INCOMPLETA')) return '006';
    if (v.includes('SECUNDARIA') && v.includes('COMPLETA')) return '007';
    if ((v.includes('TÉCNICA') || v.includes('TECNICA')) && v.includes('INCOMPLETA')) return '008';
    if ((v.includes('TÉCNICA') || v.includes('TECNICA')) && v.includes('COMPLETA')) return '009';
    if (v.includes('SUPERIOR') && v.includes('INCOMPLETA')) return '010';
    if (v.includes('SUPERIOR') && v.includes('COMPLETA')) return '011';
    if (v.includes('UNIVERSITARIA') && v.includes('INCOMPLETA')) return '012';
    if (v.includes('UNIVERSITARIA') && v.includes('COMPLETA')) return '013';
    if (v.includes('BACHILLER')) return '014';
    if (v.includes('TITULADO')) return '015';
    if ((v.includes('MAESTRÍA') || v.includes('MAESTRIA')) && v.includes('INCOMPLETA')) return '016';
    if ((v.includes('MAESTRÍA') || v.includes('MAESTRIA')) && v.includes('COMPLETA') && !v.includes('GRADO')) return '017';
    if (v.includes('GRADO') && (v.includes('MAESTRÍA') || v.includes('MAESTRIA'))) return '018';
    if (v.includes('DOCTORADO') && v.includes('INCOMPLETO')) return '019';
    if (v.includes('DOCTORADO') && v.includes('COMPLETO')) return '020';
    if (v.includes('DOCTOR')) return '021';
    if (v.includes('OTROS')) return '022';
    return '';
  }

  // ── Bancos ────────────────────────────────────────────────────────────────
  cargarBancos() {
    this.masterService.Bancos('001').subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.bancos = response.data.map((b: any) => ({
            label: b.descripcion?.trim(),
            value: b.iddocumento?.trim()
          }));
        }
      },
      error: () => {}
    });
  }

  cargarUbigeos() {
    this.cargandoUbigeos = true;
    this.apiService.listarUbigeosPersonal().subscribe({
      next: (response) => {
        this.cargandoUbigeos = false;
        const data = response?.data ?? [];
        if (Array.isArray(data)) {
          this.ubigeos = data.map((u: any) => ({
            label: u.descripcion?.trim() ?? '',
            value: u.idubigeo ?? ''
          }));
        }
      },
      error: () => {
        this.cargandoUbigeos = false;
        this.ubigeos = [];
      }
    });
  }

  // ── Ubigeo ────────────────────────────────────────────────────────────────
  cargarDepartamentos() {
    this.cargandoDep = true;
    this.apiService.listarDepartamentos().subscribe({
      next: (res) => {
        this.cargandoDep = false;
        const data = res?.data ?? res ?? [];
        if (Array.isArray(data)) {
          this.departamentos = data.map((d: any) => ({
            label: d.descripcion?.trim() ?? d.nombre?.trim() ?? d.label,
            value: d.id ?? d.codigo ?? d.value
          }));
        }
      },
      error: () => { this.cargandoDep = false; }
    });
  }

  cargarProvincias(codigoDep: string) {
    this.cargandoProv = true;
    this.provincias = [];
    this.apiService.listarProvincias(codigoDep).subscribe({
      next: (res) => {
        this.cargandoProv = false;
        const data = res?.data ?? res ?? [];
        if (Array.isArray(data)) {
          this.provincias = data.map((p: any) => ({
            label: p.descripcion?.trim() ?? p.nombre?.trim() ?? p.label,
            value: p.id ?? p.codigo ?? p.value
          }));
        }
      },
      error: () => { this.cargandoProv = false; }
    });
  }

  cargarDistritos(codigoProv: string) {
    this.cargandoDist = true;
    this.distritos = [];
    this.apiService.listarDistritos(codigoProv).subscribe({
      next: (res) => {
        this.cargandoDist = false;
        const data = res?.data ?? res ?? [];
        if (Array.isArray(data)) {
          this.distritos = data.map((d: any) => ({
            label: d.descripcion?.trim() ?? d.nombre?.trim() ?? d.label,
            value: d.id ?? d.codigo ?? d.value
          }));
        }
      },
      error: () => { this.cargandoDist = false; }
    });
  }

  private precargarUbigeo(idUbigeo: string) {
    this.depSeleccionado = '';
    this.provSeleccionada = '';
    this.distSeleccionado = '';
    this.provincias = [];
    this.distritos = [];

    if (!idUbigeo || idUbigeo.length < 2) return;

    const dep = idUbigeo.substring(0, 2);
    this.depSeleccionado = dep;

    if (idUbigeo.length < 4) return;

    const prov = idUbigeo.substring(0, 4);
    this.cargandoProv = true;
    this.apiService.listarProvincias(dep).subscribe({
      next: (res) => {
        this.cargandoProv = false;
        const data = res?.data ?? res ?? [];
        if (Array.isArray(data)) {
          this.provincias = data.map((p: any) => ({
            label: p.descripcion?.trim() ?? p.nombre?.trim() ?? p.label,
            value: p.id ?? p.codigo ?? p.value
          }));
        }
        this.provSeleccionada = prov;

        if (idUbigeo.length < 6) return;

        this.cargandoDist = true;
        this.apiService.listarDistritos(prov).subscribe({
          next: (res2) => {
            this.cargandoDist = false;
            const data2 = res2?.data ?? res2 ?? [];
            if (Array.isArray(data2)) {
              this.distritos = data2.map((d: any) => ({
                label: d.descripcion?.trim() ?? d.nombre?.trim() ?? d.label,
                value: d.id ?? d.codigo ?? d.value
              }));
            }
            this.distSeleccionado = idUbigeo;
          },
          error: () => { this.cargandoDist = false; }
        });
      },
      error: () => { this.cargandoProv = false; }
    });
  }

  onDepChange() {
    this.provSeleccionada = '';
    this.distSeleccionado = '';
    this.provincias = [];
    this.distritos = [];
    this.form.IdUbigeo = '';
    if (this.depSeleccionado) this.cargarProvincias(this.depSeleccionado);
  }

  onProvChange() {
    this.distSeleccionado = '';
    this.distritos = [];
    this.form.IdUbigeo = '';
    if (this.provSeleccionada) this.cargarDistritos(this.provSeleccionada);
  }

  onDistChange() {
    this.form.IdUbigeo = this.distSeleccionado;
  }

  onUbigeoChange() {
    this.form.IdUbigeo = this.ubigeoSeleccionado;
  }

  // ── Variables ─────────────────────────────────────────────────────────────
  private parseContacto(valor: string, contacto: Contacto) {
    if (!valor?.trim()) {
      contacto.nombre = '';
      contacto.telefono = '';
      contacto.parentesco = '';
      return;
    }
    const parts = valor.split(',');
    contacto.nombre     = parts[0]?.trim() ?? '';
    contacto.telefono   = parts[1]?.trim() ?? '';
    contacto.parentesco = parts[2]?.trim() ?? '';
  }

  private formatContacto(c: Contacto): string {
    return [c.nombre, c.telefono, c.parentesco].join(',');
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  private cargarVariablesPersonal(documento: string) {
    const dni = (documento ?? '').trim();
    if (!dni) {
      this.cargandoVariables = false;
      return;
    }

    this.cargandoVariables = true;
    this.apiService.listarVariablesPersonal(dni).subscribe({
      next: (response) => {
        this.cargandoVariables = false;
        this.varGrupoSanguineo = '';
        this.varAlergias = '';
        this.varMedicinas = '';
        this.contacto1 = { nombre: '', telefono: '', parentesco: '' };
        this.contacto2 = { nombre: '', telefono: '', parentesco: '' };

        const variables = Array.isArray(response?.data) ? response.data as VariablePersonal[] : [];
        for (const variable of variables) {
          const id = variable?.idvariable?.trim();
          const valor = variable?.valor ?? '';

          switch (id) {
            case '018':
              this.parseContacto(valor, this.contacto1);
              break;
            case '019':
              this.varGrupoSanguineo = valor;
              break;
            case '020':
              this.varAlergias = valor;
              break;
            case '021':
              this.varMedicinas = valor;
              break;
            case '022':
              this.parseContacto(valor, this.contacto2);
              break;
          }
        }
      },
      error: () => {
        this.cargandoVariables = false;
        this.varGrupoSanguineo = '';
        this.varAlergias = '';
        this.varMedicinas = '';
        this.contacto1 = { nombre: '', telefono: '', parentesco: '' };
        this.contacto2 = { nombre: '', telefono: '', parentesco: '' };
      }
    });
  }

  guardarPersonal() {
    if (!this.personalSeleccionado) return;
    this.form.Direccion_Referencia = this.construirReferenciaGuardada();
    this.cargando = true;
    const codigo = this.personalSeleccionado.codigo;

    const saves = [
      this.apiService.editarPersonal(codigo, this.form),
      this.apiService.guardarVariablePersonal(codigo, '019', this.varGrupoSanguineo).pipe(catchError(() => of(null))),
      this.apiService.guardarVariablePersonal(codigo, '020', this.varAlergias).pipe(catchError(() => of(null))),
      this.apiService.guardarVariablePersonal(codigo, '021', this.varMedicinas).pipe(catchError(() => of(null))),
      this.apiService.guardarVariablePersonal(codigo, '018', this.formatContacto(this.contacto1)).pipe(catchError(() => of(null))),
      this.apiService.guardarVariablePersonal(codigo, '022', this.formatContacto(this.contacto2)).pipe(catchError(() => of(null))),
    ];

    forkJoin(saves).subscribe({
      next: ([mainRes]) => {
        this.cargando = false;
        if ((mainRes as any)?.success) {
          this.messageService.add({
            severity: 'success', summary: 'Guardado',
            detail: 'Los datos fueron actualizados correctamente', life: 3000
          });
          const usuario = this.getCookie('usuario');
          if (usuario) this.cargarPersonalPorDocumento(usuario);
        } else {
          this.messageService.add({
            severity: 'warn', summary: 'Advertencia',
            detail: (mainRes as any)?.message ?? 'No se pudo actualizar el registro', life: 3000
          });
        }
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: 'Ocurrió un error al guardar los datos', life: 3000
        });
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GALERÍA DE ARCHIVOS
  // ══════════════════════════════════════════════════════════════════════════

  cargarArchivos(codigo: string) {
    this.cargandoArchivos = true;
    this.apiService.listarArchivosPersonal(codigo).subscribe({
      next: (response) => {
        this.cargandoArchivos = false;
        if (response?.success && Array.isArray(response.data)) {
          this.archivos = response.data.map((a: any) => ({
            nombre: a.nombre ?? a.name ?? '',
            url: a.url ?? a.ruta ?? '',
            esImagen: this.esImagen(a.nombre ?? a.name ?? '')
          }));
        } else {
          this.archivos = [];
        }
      },
      error: () => {
        this.cargandoArchivos = false;
        this.archivos = [];
      }
    });
  }

  onSeleccionarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.personalSeleccionado) return;

    const archivo = input.files[0];
    input.value = '';

    const tipoArchivo = this.esImagen(archivo.name) ? 'imagen' : 'pdf';
    const carpeta = this.personalSeleccionado.codigo;

    this.subiendoArchivo = true;

    this.apiService.subirArchivoPersonal(carpeta, archivo, tipoArchivo).subscribe({
      next: () => {
        this.subiendoArchivo = false;
        this.messageService.add({
          severity: 'success', summary: 'Subido',
          detail: `${archivo.name} subido correctamente`, life: 3000
        });
        this.cargarArchivos(this.personalSeleccionado!.codigo);
      },
      error: () => {
        this.subiendoArchivo = false;
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: `No se pudo subir ${archivo.name}`, life: 3000
        });
      }
    });
  }

  abrirLightbox(url: string) { this.imagenVistaPrevia = url; }
  cerrarLightbox() { this.imagenVistaPrevia = null; }
  abrirArchivo(url: string) { window.open(url, '_blank'); }

  esImagen(nombre: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(nombre);
  }

  getNombreCorto(nombre: string): string {
    return nombre.length > 22 ? nombre.substring(0, 19) + '...' : nombre;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BENEFICIARIOS
  // ══════════════════════════════════════════════════════════════════════════

  cargarBeneficiarios(codigo: string) {
    this.cargandoBeneficiarios = true;
    this.apiService.listarBeneficiarios(codigo).subscribe({
      next: (response) => {
        this.cargandoBeneficiarios = false;
        if (response?.success && Array.isArray(response.data)) {
          this.beneficiarios = response.data.map((b: any) => this.mapearBeneficiarioDesdeBackend(b));
        }
      },
      error: () => {
        this.cargandoBeneficiarios = false;
      }
    });
  }

  agregarBeneficiarioPorDocumento(documento: string, tipoDocumento: string) {
    const documentoLimpio = (documento ?? '').trim();
    const tipoDoc = this.normalizarTipoDocumentoBeneficiario(tipoDocumento);
    if (!this.esDocumentoBeneficiarioValido(documentoLimpio, tipoDoc)) return;

    if (this.beneficiarios.some(b => b.dni === documentoLimpio && b.tipoDocumento === tipoDoc)) {
      this.messageService.add({
        severity: 'warn', summary: 'Duplicado', detail: 'Este documento ya fue agregado', life: 3000
      });
      return;
    }

    const nuevo: Beneficiario = {
      item: '', tipoDocumento: tipoDoc, dni: documentoLimpio, nombres: '', apellidoPaterno: '',
      apellidoMaterno: '', fechaNacimiento: '', sexo: '',
      buscando: true, guardando: false, guardado: false, editando: false, error: ''
    };
    this.beneficiarios = [...this.beneficiarios, nuevo];
    this.nuevoBeneficiarioDocumento = '';

    const consulta$ = tipoDoc === '04'
      ? this.masterService.factilizaCee(documentoLimpio)
      : this.masterService.factiliza(documentoLimpio);

    consulta$.subscribe({
      next: (res) => {
        nuevo.buscando = false;
        if (res?.success && res?.data) {
          const d = res.data;
          nuevo.nombres = d.nombres ?? d.nombre ?? '';
          nuevo.apellidoPaterno = d.apellido_paterno ?? d.a_Paterno ?? d.a_PATERNO ?? '';
          nuevo.apellidoMaterno = d.apellido_materno ?? d.a_Materno ?? d.a_MATERNO ?? '';
          nuevo.fechaNacimiento = this.normalizarFechaParaInput(
            d.fecha_nacimiento ?? d.fechaNacimiento ?? d.fecha_Nacimiento ?? d.fechA_NACIMIENTO ?? ''
          );
          nuevo.sexo = d.sexo ?? '';
        } else {
          nuevo.error = 'No encontrado en Factiliza';
        }
        this.beneficiarios = [...this.beneficiarios];
      },
      error: () => {
        nuevo.buscando = false;
        nuevo.error = 'Error al consultar Factiliza';
        this.beneficiarios = [...this.beneficiarios];
      }
    });
  }

  guardarBeneficiario(b: Beneficiario) {
    if (!this.personalSeleccionado || b.buscando) return;

    const request: BeneficiarioRequest = {
      IdDocIdentidad: this.normalizarTipoDocumentoBeneficiario(b.tipoDocumento),
      Nombres: b.nombres,
      A_Paterno: b.apellidoPaterno,
      A_Materno: b.apellidoMaterno,
      NroDocumento: b.dni,
      Fecha_Nacimiento: b.fechaNacimiento || null,
      Sexo: b.sexo || ''
    };

    b.guardando = true;
    const codigo = this.personalSeleccionado.codigo;

    const accion$ = b.guardado && b.item
      ? this.apiService.editarBeneficiario(codigo, b.item, request)
      : this.apiService.crearBeneficiario(codigo, request);

    accion$.subscribe({
      next: (response) => {
        b.guardando = false;
        if (response?.success) {
          b.guardado = true;
          b.editando = false;
          if (response.data?.item) b.item = response.data.item;
          this.beneficiarios = [...this.beneficiarios];
          this.messageService.add({
            severity: 'success', summary: 'Guardado',
            detail: `Beneficiario ${b.dni} guardado correctamente`, life: 3000
          });
        } else {
          b.error = response?.message ?? 'No se pudo guardar';
          this.beneficiarios = [...this.beneficiarios];
          this.messageService.add({
            severity: 'warn', summary: 'Advertencia', detail: b.error, life: 3000
          });
        }
      },
      error: () => {
        b.guardando = false;
        b.error = 'Error al guardar el beneficiario';
        this.beneficiarios = [...this.beneficiarios];
        this.messageService.add({
          severity: 'error', summary: 'Error', detail: b.error, life: 3000
        });
      }
    });
  }

  habilitarEdicion(b: Beneficiario) {
    b.editando = true;
    b.error = '';
    this.beneficiarios = [...this.beneficiarios];
  }

  cancelarEdicion(b: Beneficiario, index: number) {
    if (!b.guardado) {
      this.beneficiarios = this.beneficiarios.filter((_, i) => i !== index);
    } else {
      b.editando = false;
      b.error = '';
      this.beneficiarios = [...this.beneficiarios];
      this.cargarBeneficiarios(this.personalSeleccionado!.codigo);
    }
  }

  eliminarBeneficiario(index: number) {
    this.beneficiarios = this.beneficiarios.filter((_, i) => i !== index);
  }

  salir(): void {
    this.authService.logout();
    this.router.navigate(['/login-documento']);
  }

  onReferenciaInput(): void {
    this.form.Direccion_Referencia = this.referenciaTexto;
  }

  async buscarReferenciaEnMapa(): Promise<void> {
    const referencia = this.referenciaTexto.trim();
    const ubigeoTexto = this.getTextoUbigeoSeleccionado();
    this.errorMapaReferencia = '';

    this.asegurarMapaReferencia();

    if (!ubigeoTexto) {
      this.errorMapaReferencia = 'Seleccione ubigeo antes de ubicar la referencia.';
      return;
    }

    this.cargandoMapaReferencia = true;

    try {
      let primerResultado: any = null;

      for (const query of this.construirConsultasReferencia()) {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const resultado = Array.isArray(data) ? data[0] : null;
        if (resultado?.lat && resultado?.lon) {
          primerResultado = resultado;
          break;
        }
      }

      if (!primerResultado?.lat || !primerResultado?.lon) {
        this.errorMapaReferencia = 'No se encontr� la referencia con los datos de direcci�n indicados.';
        return;
      }

      this.actualizarUbicacionReferencia(
        Number(primerResultado.lat),
        Number(primerResultado.lon),
        true
      );
    } catch {
      this.errorMapaReferencia = 'No se pudo obtener la ubicaci�n en el mapa.';
    } finally {
      this.cargandoMapaReferencia = false;
    }
  }

  getTextoCoordenadasReferencia(): string {
    if (this.referenciaLatitud == null || this.referenciaLongitud == null) {
      return 'Sin coordenadas seleccionadas';
    }

    return `${this.referenciaLatitud.toFixed(6)}, ${this.referenciaLongitud.toFixed(6)}`;
  }

  puedeBuscarBeneficiario(): boolean {
    return this.esDocumentoBeneficiarioValido(
      this.nuevoBeneficiarioDocumento,
      this.nuevoBeneficiarioTipoDocumento
    );
  }

  getPlaceholderDocumentoBeneficiario(): string {
    return this.nuevoBeneficiarioTipoDocumento === '04'
      ? 'Carné de extranjería'
      : 'DNI del beneficiario (8 dígitos)';
  }

  getMaxLengthDocumentoBeneficiario(): number {
    return this.nuevoBeneficiarioTipoDocumento === '04' ? 12 : 8;
  }

  getEtiquetaTipoDocumentoBeneficiario(tipoDocumento: string): string {
    return this.normalizarTipoDocumentoBeneficiario(tipoDocumento) === '04' ? 'CEE' : 'DNI';
  }

  private resetearReferenciaMapa(): void {
    this.referenciaTexto = '';
    this.referenciaLatitud = null;
    this.referenciaLongitud = null;
    this.errorMapaReferencia = '';
    this.cargandoMapaReferencia = false;
    if (this.referenciaTimeout) {
      clearTimeout(this.referenciaTimeout);
      this.referenciaTimeout = null;
    }
    if (this.markerReferencia) {
      this.markerReferencia.remove();
      this.markerReferencia = null;
    }
    if (this.mapaReferencia) {
      this.mapaReferencia.remove();
      this.mapaReferencia = null;
    }
  }

  private descomponerReferenciaGuardada(valor: string): { texto: string; latitud: number | null; longitud: number | null } {
    const limpio = `${valor ?? ''}`.trim();
    if (!limpio) {
      return { texto: '', latitud: null, longitud: null };
    }

    const partes = limpio.split(',').map(parte => parte.trim()).filter(Boolean);
    if (partes.length < 3) {
      return { texto: limpio, latitud: null, longitud: null };
    }

    const latitud = Number(partes[partes.length - 2]);
    const longitud = Number(partes[partes.length - 1]);

    if (Number.isNaN(latitud) || Number.isNaN(longitud)) {
      return { texto: limpio, latitud: null, longitud: null };
    }

    return {
      texto: partes.slice(0, -2).join(', '),
      latitud,
      longitud
    };
  }

  private construirReferenciaGuardada(): string {
    const referencia = this.referenciaTexto.trim();
    if (!referencia) return '';
    if (this.referenciaLatitud == null || this.referenciaLongitud == null) return referencia;
    return `${referencia},${this.referenciaLatitud.toFixed(6)},${this.referenciaLongitud.toFixed(6)}`;
  }


  private construirConsultasReferencia(): string[] {
    const ubigeo = this.getTextoUbigeoSeleccionado();
    const referencia = this.referenciaTexto.trim();
    const zona = `${this.form.Descripcion_Zona ?? ''}`.trim();
    const via = `${this.form.Descripcion_Via ?? ''}`.trim();
    const numero = this.form.Direccion_Numero != null ? `${this.form.Direccion_Numero}`.trim() : '';
    const kilometro = `${this.form.Direccion_Kilometro ?? ''}`.trim();
    const manzana = `${this.form.Direccion_Manzana ?? ''}`.trim();
    const lote = `${this.form.Direccion_Lote ?? ''}`.trim();

    const numeroKmMz = [
      numero ? `N� ${numero}` : '',
      kilometro ? `KM ${kilometro}` : '',
      manzana ? `Mz ${manzana}` : '',
      lote ? `Lote ${lote}` : ''
    ].filter(Boolean).join(' ');

    const candidatos = [
      [referencia, ubigeo, 'Peru'],
      [zona, ubigeo, 'Peru'],
      [via, numeroKmMz, ubigeo, 'Peru'],
      [via, ubigeo, 'Peru'],
      [referencia, zona, ubigeo, 'Peru'],
      [referencia, via, numeroKmMz, ubigeo, 'Peru'],
      [zona, via, numeroKmMz, ubigeo, 'Peru']
    ];

    return candidatos
      .map(partes => partes.filter(Boolean).join(', ').trim())
      .filter((valor, index, array) => !!valor && array.indexOf(valor) === index);
  }

  private configurarMapaReferenciaInicial(): void {
    this.asegurarMapaReferencia();

    if (this.referenciaLatitud != null && this.referenciaLongitud != null) {
      this.actualizarUbicacionReferencia(this.referenciaLatitud, this.referenciaLongitud, true);
      return;
    }

    this.mapaReferencia?.setView([-12.046374, -77.042793], 12);
  }

  private asegurarMapaReferencia(): void {
    if (this.mapaReferencia) {
      setTimeout(() => this.mapaReferencia?.invalidateSize(), 0);
      return;
    }

    const contenedorMapa = document.getElementById('referencia-map');
    if (!contenedorMapa) {
      setTimeout(() => this.asegurarMapaReferencia(), 100);
      return;
    }

    this.mapaReferencia = L.map('referencia-map', {
      zoomControl: true
    }).setView([-12.046374, -77.042793], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.mapaReferencia);

    this.mapaReferencia.on('click', (event: L.LeafletMouseEvent) => {
      this.actualizarUbicacionReferencia(event.latlng.lat, event.latlng.lng, false);
    });

    setTimeout(() => this.mapaReferencia?.invalidateSize(), 0);
  }

  private actualizarUbicacionReferencia(latitud: number, longitud: number, centrarMapa: boolean): void {
    this.referenciaLatitud = latitud;
    this.referenciaLongitud = longitud;
    this.errorMapaReferencia = '';
    this.asegurarMapaReferencia();

    if (!this.mapaReferencia) return;

    if (!this.markerReferencia) {
      this.markerReferencia = L.marker([latitud, longitud], {
        draggable: true,
        icon: this.iconoMapa
      }).addTo(this.mapaReferencia);

      this.markerReferencia.on('dragend', () => {
        const posicion = this.markerReferencia?.getLatLng();
        if (!posicion) return;
        this.referenciaLatitud = posicion.lat;
        this.referenciaLongitud = posicion.lng;
      });
    } else {
      this.markerReferencia.setLatLng([latitud, longitud]);
    }

    if (centrarMapa) {
      this.mapaReferencia.setView([latitud, longitud], 17);
    }
  }

  private getTextoUbigeoSeleccionado(): string {
    const ubigeo = this.ubigeos.find(u => u.value === this.ubigeoSeleccionado)?.label ?? '';
    if (ubigeo) {
      return ubigeo;
    }

    const departamento = this.departamentos.find(d => d.value === this.depSeleccionado)?.label ?? '';
    const provincia = this.provincias.find(p => p.value === this.provSeleccionada)?.label ?? '';
    const distrito = this.distritos.find(d => d.value === this.distSeleccionado)?.label ?? '';

    return [distrito, provincia, departamento].filter(Boolean).join(', ');
  }

  private mapearBeneficiarioDesdeBackend(b: any): Beneficiario {
    return {
      item: b.item ?? b.codigo ?? '',
      tipoDocumento: this.normalizarTipoDocumentoBeneficiario(
        b.iddocidentidad ?? b.idDocIdentidad ?? b.IdDocIdentidad ?? b.tipoDocumento ?? b.idDocumento
      ),
      dni: b.nroDocumento ?? b.nrodocumento ?? b.dni ?? '',
      nombres: b.nombres ?? b.nombre ?? '',
      apellidoPaterno: b.a_Paterno ?? b.a_PATERNO ?? b.apellidoPaterno ?? '',
      apellidoMaterno: b.a_Materno ?? b.a_MATERNO ?? b.apellidoMaterno ?? '',
      fechaNacimiento: this.normalizarFechaParaInput(
        b.fecha_Nacimiento ?? b.fechA_NACIMIENTO ?? b.fechaNacimiento ?? ''
      ),
      sexo: b.sexo ?? '',
      buscando: false,
      guardando: false,
      guardado: true,
      editando: false,
      error: ''
    };
  }

  private normalizarTipoDocumentoBeneficiario(tipoDocumento: string): string {
    return `${tipoDocumento ?? ''}`.trim() === '04' ? '04' : '01';
  }

  private esDocumentoBeneficiarioValido(documento: string, tipoDocumento: string): boolean {
    const valor = (documento ?? '').trim();
    const tipoDoc = this.normalizarTipoDocumentoBeneficiario(tipoDocumento);
    if (!valor) return false;
    if (tipoDoc === '01') return /^\d{8}$/.test(valor);
    return true;
  }

  private normalizarFechaParaInput(fecha: string): string {
    const valor = `${fecha ?? ''}`.trim();
    if (!valor) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.substring(0, 10);

    const partes = valor.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      if (dia && mes && anio) return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return valor;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getNombreCompleto(): string {
    if (!this.personalSeleccionado) return '';
    const p = this.personalSeleccionado;
    return `${p.nombres ?? ''} ${p.apellido_Paterno ?? ''} ${p.apellido_Materno ?? ''}`.trim();
  }

}

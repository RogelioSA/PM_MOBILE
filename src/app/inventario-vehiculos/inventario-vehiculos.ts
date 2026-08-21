import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  ActualizarInventarioVehiculoPayload,
  Api,
  InventarioVehiculoPayload,
  InventarioVehiculoRegistro,
  VehiculoRecepcion
} from '../services/api';
import { Master } from '../services/master';
import { Menu } from '../menu/menu';

interface Opcion {
  label: string;
  value: string;
}

type ModoFormulario = 'crear' | 'editar' | 'ver';

@Component({
  selector: 'app-inventario-vehiculos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Menu,
    SelectModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    PanelModule,
    InputTextModule,
    TableModule,
    DatePickerModule,
    ToastModule,
    TooltipModule,
    ZXingScannerModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './inventario-vehiculos.html',
  styleUrl: './inventario-vehiculos.css'
})
export class InventarioVehiculos implements OnInit {
  inventarios: InventarioVehiculoRegistro[] = [];
  sucursales: Opcion[] = [];
  almacenesFiltro: Opcion[] = [];
  almacenesFormulario: Opcion[] = [];
  private almacenesPorSucursal = new Map<string, Opcion[]>();

  fechaFiltro: Date | null = null;
  sucursalFiltro = '';
  almacenFiltro = '';
  observacionFiltro = '';

  modalVisible = false;
  modoFormulario: ModoFormulario = 'crear';
  idInventario: number | string | null = null;
  fechaInventario = new Date();
  sucursalSeleccionada: string | null = null;
  almacenSeleccionado: string | null = null;
  observacion = '';
  cabeceraColapsada = true;
  vinManual = '';
  vehiculos: VehiculoRecepcion[] = [];

  cargando = false;
  cargandoVehiculos = false;
  guardando = false;
  eliminandoId: number | string | null = null;
  scannerActivo = false;
  formatsEnabled: BarcodeFormat[] = [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128];

  constructor(
    private api: Api,
    private master: Master,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.fechaFiltro = new Date();
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.master.getSucursales().subscribe({
      next: (response) => {
        const data = response?.success && Array.isArray(response.data) ? response.data : [];
        this.sucursales = data.map((item: any) => ({
          label: item.descripcion,
          value: item.idSucursal
        }));

        if (this.sucursales.length > 0) {
          this.sucursalFiltro = this.sucursales[0].value;
          this.cargarAlmacenesFiltro(this.sucursalFiltro, true, true);
        } else {
          this.buscar();
        }

        const sucursalGuardada = localStorage.getItem('cbSucursal');
        const almacenGuardado = localStorage.getItem('cbAlmacen');
        if (sucursalGuardada && this.sucursales.some(x => x.value === sucursalGuardada)) {
          this.sucursalSeleccionada = sucursalGuardada;
          this.cargarAlmacenesFormulario(sucursalGuardada, almacenGuardado);
        }
      },
      error: () => this.mostrarError('No se pudieron cargar las sucursales')
    });
  }

  cambiarSucursalFiltro(idSucursal: string): void {
    this.sucursalFiltro = idSucursal;
    this.almacenFiltro = '';
    this.almacenesFiltro = [];
    if (!idSucursal) return;
    this.cargarAlmacenesFiltro(idSucursal);
  }

  cambiarSucursalFormulario(idSucursal: string | null): void {
    this.sucursalSeleccionada = idSucursal;
    this.almacenSeleccionado = null;
    this.almacenesFormulario = [];
    if (!idSucursal) return;

    localStorage.setItem('cbSucursal', idSucursal);
    this.cargarAlmacenesFormulario(idSucursal);
  }

  cambiarAlmacenFormulario(idAlmacen: string | null): void {
    this.almacenSeleccionado = idAlmacen;
    if (idAlmacen) localStorage.setItem('cbAlmacen', idAlmacen);
  }

  buscar(): void {
    this.cargando = true;
    this.api.listarInventariosVehiculos({
      fecha: this.fechaFiltro ? this.formatearFecha(this.fechaFiltro) : undefined,
      sucursal: this.sucursalFiltro || undefined,
      almacen: this.almacenFiltro || undefined,
      observacion: this.observacionFiltro.trim() || undefined
    }).subscribe({
      next: async response => {
        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        this.inventarios = data.map((item: any) => this.normalizarInventario(item));
        await this.resolverDescripcionesInventarios();
        this.cargando = false;
      },
      error: error => {
        this.inventarios = [];
        this.cargando = false;
        this.mostrarError(error?.error?.message || 'No se pudieron cargar los inventarios');
      }
    });
  }

  limpiarFiltros(): void {
    this.fechaFiltro = null;
    this.sucursalFiltro = '';
    this.almacenFiltro = '';
    this.observacionFiltro = '';
    this.almacenesFiltro = [];
    this.buscar();
  }

  abrirNuevo(): void {
    if (!this.puedeIniciarInventario) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Faltan datos',
        detail: 'Selecciona sucursal, almacén y fecha antes de escanear',
        life: 3000
      });
      return;
    }

    this.modoFormulario = 'crear';
    this.idInventario = null;
    this.fechaInventario = new Date(this.fechaFiltro!.getTime());
    this.observacion = this.observacionFiltro.trim();
    this.cabeceraColapsada = false;
    this.vinManual = '';
    this.vehiculos = [];
    this.heredarUbicacionDeFiltros();
    this.modalVisible = true;
    this.scannerActivo = true;
  }

  abrirEditar(item: InventarioVehiculoRegistro): void {
    this.cargarFormulario(item, 'editar');
  }

  abrirVer(item: InventarioVehiculoRegistro): void {
    this.cargarFormulario(item, 'ver');
  }

  confirmarEliminar(item: InventarioVehiculoRegistro): void {
    this.confirmationService.confirm({
      header: 'Eliminar inventario',
      message: `¿Deseas eliminar el inventario ${item.codigo}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => void this.eliminarInventario(item)
    });
  }

  cerrarModal(): void {
    this.scannerActivo = false;
    this.modalVisible = false;
  }

  activarScanner(): void {
    if (!this.soloLectura) this.scannerActivo = true;
  }

  reiniciar(): void {
    if (this.soloLectura) return;
    this.vehiculos = [];
    this.vinManual = '';
    this.reactivarScanner();
  }

  nuevoScaneo(): void {
    if (this.soloLectura) return;
    this.vinManual = '';
    this.reactivarScanner();
  }

  onScanSuccess(vin: string): void {
    if (!vin || this.soloLectura) return;
    void this.agregarVehiculo(vin);
  }

  agregarVinManual(): void {
    if (!this.vinManual.trim() || this.soloLectura) return;
    const vin = this.vinManual;
    this.vinManual = '';
    void this.agregarVehiculo(vin);
  }

  async agregarVehiculo(rawVin: string): Promise<void> {
    const vin = this.limpiarVin(rawVin);
    if (!vin) return;
    if (this.vehiculos.some(item => item.vin.toUpperCase() === vin.toUpperCase())) {
      this.messageService.add({
        severity: 'warn', summary: 'VIN duplicado', detail: `El VIN ${vin} ya está en la lista`, life: 3000
      });
      return;
    }

    try {
      const response: any = await firstValueFrom(this.api.getVehiculoPorVinRecepcion(vin));
      const vehiculo = response?.data ?? response;
      if (!vehiculo || Object.keys(vehiculo).length === 0) throw new Error('VIN no encontrado');
      this.vehiculos = [this.normalizarVehiculo(vehiculo), ...this.vehiculos];
      this.scannerActivo = false;
    } catch {
      this.mostrarError(`No se pudo reconocer el VIN ${vin} en el sistema`);
    }
  }

  eliminarVehiculo(vin: string): void {
    if (this.soloLectura) return;
    this.vehiculos = this.vehiculos.filter(item => item.vin !== vin);
  }

  async guardar(): Promise<void> {
    if (this.soloLectura || this.guardando) return;
    if (!this.sucursalSeleccionada || !this.almacenSeleccionado || !this.fechaInventario) {
      this.messageService.add({
        severity: 'warn', summary: 'Faltan datos',
        detail: 'Completa fecha, sucursal y almacén', life: 3000
      });
      return;
    }
    if (this.vehiculos.length === 0) {
      this.messageService.add({
        severity: 'warn', summary: 'Sin vehículos',
        detail: 'Escanea o ingresa al menos un VIN', life: 3000
      });
      return;
    }

    const payload: InventarioVehiculoPayload = {
      IdEmpresa: '001',
      fecha: this.formatearFecha(this.fechaInventario),
      sucursal: this.sucursalSeleccionada,
      almacen: this.almacenSeleccionado,
      observacion: this.observacion.trim(),
      vehiculos: this.vehiculos.map(item => item.vin)
    };

    this.guardando = true;
    try {
      if (this.modoFormulario === 'editar' && this.idInventario !== null) {
        const actualizar: ActualizarInventarioVehiculoPayload = {
          ...payload,
          IdInventario: this.idInventario
        };
        await firstValueFrom(this.api.actualizarInventarioVehiculos(actualizar));
      } else {
        await firstValueFrom(this.api.crearInventarioVehiculos(payload));
      }

      this.messageService.add({
        severity: 'success', summary: 'Guardado',
        detail: this.modoFormulario === 'editar'
          ? 'Inventario actualizado correctamente'
          : 'Inventario registrado correctamente',
        life: 3000
      });
      this.cerrarModal();
      this.buscar();
    } catch (error: any) {
      this.mostrarError(error?.error?.message || 'No se pudo guardar el inventario');
    } finally {
      this.guardando = false;
    }
  }

  private async eliminarInventario(item: InventarioVehiculoRegistro): Promise<void> {
    if (item.idInventario === null || item.idInventario === '') return;

    this.eliminandoId = item.idInventario;
    try {
      await firstValueFrom(this.api.eliminarInventarioVehiculos(item.idInventario, '001'));
      this.messageService.add({
        severity: 'success',
        summary: 'Inventario eliminado',
        detail: `El inventario ${item.codigo} fue eliminado correctamente`,
        life: 3000
      });
      this.buscar();
    } catch (error: any) {
      this.mostrarError(error?.error?.message || 'No se pudo eliminar el inventario');
    } finally {
      this.eliminandoId = null;
    }
  }

  get soloLectura(): boolean {
    return this.modoFormulario === 'ver';
  }

  get puedeIniciarInventario(): boolean {
    return Boolean(this.sucursalFiltro && this.almacenFiltro && this.fechaFiltro);
  }

  get tituloModal(): string {
    if (this.modoFormulario === 'editar') return 'Editar inventario de vehículos';
    if (this.modoFormulario === 'ver') return 'Detalle del inventario de vehículos';
    return 'Scanner de inventario de vehículos';
  }

  private cargarFormulario(item: InventarioVehiculoRegistro, modo: ModoFormulario): void {
    this.modoFormulario = modo;
    this.idInventario = item.idInventario;
    this.fechaInventario = this.parsearFecha(item.fecha);
    this.sucursalSeleccionada = item.idSucursal ?? item.sucursal;
    this.almacenSeleccionado = item.idAlmacen ?? item.almacen;
    this.observacion = item.observacion;
    this.cabeceraColapsada = modo === 'editar';
    this.vinManual = '';
    this.vehiculos = [];
    this.modalVisible = true;
    this.scannerActivo = false;
    if (this.sucursalSeleccionada) {
      this.cargarAlmacenesFormulario(this.sucursalSeleccionada, this.almacenSeleccionado);
    }
    void this.cargarVehiculosInventario();
  }

  private async cargarVehiculosInventario(): Promise<void> {
    if (this.idInventario === null || this.idInventario === '') return;

    this.cargandoVehiculos = true;
    try {
      const response: any = await firstValueFrom(
        this.api.listarVehiculosInventario(this.idInventario, '001')
      );
      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.vehiculos)
            ? response.data.vehiculos
            : [];

      this.vehiculos = data.map((vehiculo: any) =>
        typeof vehiculo === 'string'
          ? this.normalizarVehiculo({ vin: vehiculo })
          : this.normalizarVehiculo(vehiculo)
      );
    } catch (error: any) {
      this.vehiculos = [];
      this.mostrarError(error?.error?.message || 'No se pudieron cargar los vehículos del inventario');
    } finally {
      this.cargandoVehiculos = false;
    }
  }

  private cargarAlmacenesFormulario(idSucursal: string, almacenPreferido?: string | null): void {
    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: response => {
        this.almacenesFormulario = this.mapearAlmacenes(response);
        this.almacenesPorSucursal.set(idSucursal, this.almacenesFormulario);
        const preferido = almacenPreferido ?? this.almacenSeleccionado;
        if (preferido && this.almacenesFormulario.some(x => x.value === preferido)) {
          this.almacenSeleccionado = preferido;
        } else if (this.almacenesFormulario.length > 0) {
          this.almacenSeleccionado = this.almacenesFormulario[0].value;
        }
        if (this.almacenSeleccionado) localStorage.setItem('cbAlmacen', this.almacenSeleccionado);
      },
      error: () => this.mostrarError('No se pudieron cargar los almacenes')
    });
  }

  private cargarAlmacenesFiltro(
    idSucursal: string,
    seleccionarPrimero = false,
    buscarAlFinal = false
  ): void {
    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: response => {
        this.almacenesFiltro = this.mapearAlmacenes(response);
        this.almacenesPorSucursal.set(idSucursal, this.almacenesFiltro);
        if (seleccionarPrimero && this.almacenesFiltro.length > 0) {
          this.almacenFiltro = this.almacenesFiltro[0].value;
        }
        if (buscarAlFinal) this.buscar();
      },
      error: () => {
        this.mostrarError('No se pudieron cargar los almacenes');
        if (buscarAlFinal) this.buscar();
      }
    });
  }

  private recuperarUbicacionGuardada(): void {
    const sucursal = localStorage.getItem('cbSucursal');
    const almacen = localStorage.getItem('cbAlmacen');
    this.sucursalSeleccionada = sucursal && this.sucursales.some(x => x.value === sucursal)
      ? sucursal
      : null;
    this.almacenSeleccionado = null;
    this.almacenesFormulario = [];
    if (this.sucursalSeleccionada) {
      this.cargarAlmacenesFormulario(this.sucursalSeleccionada, almacen);
    }
  }

  private heredarUbicacionDeFiltros(): void {
    if (!this.sucursalFiltro) {
      this.recuperarUbicacionGuardada();
      return;
    }

    this.sucursalSeleccionada = this.sucursalFiltro;
    this.almacenSeleccionado = this.almacenFiltro || null;
    this.almacenesFormulario = [];
    this.cargarAlmacenesFormulario(
      this.sucursalFiltro,
      this.almacenFiltro || null
    );
  }

  private normalizarInventario(item: any): InventarioVehiculoRegistro {
    const vehiculos = item.vehiculos ?? item.Vehiculos ?? item.listaVehiculos ?? item.ListaVehiculos ?? item.detalle ?? [];
    const lista = Array.isArray(vehiculos) ? vehiculos : [];
    const idSucursal = item.idSucursal ?? item.IdSucursal ?? item.sucursalId ?? item.SucursalId
      ?? item.sucursal ?? item.Sucursal ?? '';
    const idAlmacen = item.idAlmacen ?? item.IdAlmacen ?? item.almacenId ?? item.AlmacenId
      ?? item['almacén'] ?? item.almacen ?? item.Almacen ?? '';
    const codigo = item['código'] ?? item.codigo ?? item.Codigo ?? item.codigoInventario
      ?? item.CodigoInventario ?? item.idInventario ?? item.IdInventario ?? '';

    return {
      ...item,
      idInventario: item.idInventario ?? item.IdInventario ?? item.id ?? item.Id ?? codigo,
      codigo,
      fecha: item.fecha ?? item.Fecha ?? item.fechaInventario ?? item.FechaInventario ?? '',
      sucursal: item.sucursalNombre ?? item.SucursalNombre ?? idSucursal,
      almacen: item.almacenNombre ?? item.AlmacenNombre ?? idAlmacen,
      idSucursal,
      idAlmacen,
      nroVehiculos: item['nroVehículos'] ?? item.nroVehiculos ?? item.NroVehiculos ?? item.numeroVehiculos
        ?? item.NumeroVehiculos ?? item.cantidadVehiculos ?? lista.length,
      observacion: item['observación'] ?? item.observacion ?? item.Observacion
        ?? item.observaciones ?? item.Observaciones ?? '',
      vehiculos: lista
    };
  }

  private async resolverDescripcionesInventarios(): Promise<void> {
    const sucursalesNecesarias = [...new Set(
      this.inventarios
        .map(item => item.idSucursal)
        .filter((id): id is string => Boolean(id))
    )];

    await Promise.all(sucursalesNecesarias.map(async idSucursal => {
      if (this.almacenesPorSucursal.has(idSucursal)) return;
      try {
        const response = await firstValueFrom(this.master.getAlmacenesPorSucursal(idSucursal));
        this.almacenesPorSucursal.set(idSucursal, this.mapearAlmacenes(response));
      } catch {
        this.almacenesPorSucursal.set(idSucursal, []);
      }
    }));

    this.inventarios = this.inventarios.map(item => {
      const sucursal = this.sucursales.find(opcion => opcion.value === item.idSucursal);
      const almacen = item.idSucursal
        ? this.almacenesPorSucursal.get(item.idSucursal)?.find(opcion => opcion.value === item.idAlmacen)
        : undefined;

      return {
        ...item,
        sucursal: sucursal?.label ?? item.sucursal,
        almacen: almacen?.label ?? item.almacen
      };
    });
  }

  private normalizarVehiculo(item: any): VehiculoRecepcion {
    return {
      vin: String(item.vin ?? item.VIN ?? item.nroChasis ?? item.NroChasis ?? item.codigo ?? ''),
      idVehiculo: String(item.idVehiculo ?? item.IdVehiculo ?? item.stock ?? item.Stock ?? ''),
      marca: String(item.marca ?? item.Marca ?? item.marcaNombre ?? ''),
      modelo: String(item.modelo ?? item.Modelo ?? item.modeloNombre ?? ''),
      color: String(item.color ?? item.Color ?? item.colorNombre ?? '')
    };
  }

  private mapearAlmacenes(response: any): Opcion[] {
    const data = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    return data.map((item: any) => ({
      label: item.nombre ?? item.descripcion,
      value: item.id ?? item.idAlmacen
    }));
  }

  private limpiarVin(rawVin: string): string {
    const limpio = rawVin.replace(/\s+/g, ' ').trim();
    return limpio.includes(' ') ? limpio.split(' ').at(-1) ?? '' : limpio;
  }

  private reactivarScanner(): void {
    this.scannerActivo = false;
    setTimeout(() => {
      if (this.modalVisible && !this.soloLectura) this.scannerActivo = true;
    });
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parsearFecha(value: string): Date {
    if (!value) return new Date();
    const fecha = new Date(`${value.substring(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  }

  private mostrarError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Menu } from '../menu/menu';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { firstValueFrom } from 'rxjs';
import {
  Api,
  DocumentoRecepcion,
  VehiculoRecepcion,
  VehiculoRecepcionPayload
} from '../services/api';
import { Master } from '../services/master';

interface Opcion {
  label: string;
  value: string;
}

@Component({
  selector: 'app-recepcionvehiculos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Menu,
    SelectModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TableModule,
    DatePickerModule,
    ToastModule,
    ZXingScannerModule
  ],
  providers: [MessageService],
  templateUrl: './recepcionvehiculos.html',
  styleUrl: './recepcionvehiculos.css'
})
export class Recepcionvehiculos implements OnInit {
  sucursales: Opcion[] = [];
  almacenes: Opcion[] = [];
  vehiculos: VehiculoRecepcion[] = [];

  sucursalSeleccionada: string | null = null;
  almacenSeleccionado: string | null = null;

  fechaSeleccionada: Date = new Date();
  documentoGenerado = '';
  vinManual = '';

  modalVisible = false;
  scannerActivo = false;
  guardando = false;

  formatsEnabled: BarcodeFormat[] = [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128];

  constructor(
    private api: Api,
    private master: Master,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarSeleccionesGuardadas();
    this.cargarSucursales();
  }

  cargarSeleccionesGuardadas() {
    this.sucursalSeleccionada = localStorage.getItem('cbSucursal');
    this.almacenSeleccionado = localStorage.getItem('cbAlmacen');
  }

  cargarSucursales() {
    this.master.getSucursales().subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.sucursales = response.data.map((item: any) => ({
            label: item.descripcion,
            value: String(item.idSucursal ?? '')
          }));
        }

        if (this.sucursalSeleccionada) {
          this.cambiarSucursal(this.sucursalSeleccionada, false);
        } else if (this.sucursales.length > 0) {
          this.cambiarSucursal(this.sucursales[0].value, false);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las sucursales',
          life: 4000
        });
        this.cdr.markForCheck();
      }
    });
  }

  cambiarSucursal(idSucursal: string | null, limpiarAlmacen = true) {
    this.sucursalSeleccionada = idSucursal ? String(idSucursal) : null;
    if (!idSucursal) {
      this.almacenes = [];
      this.almacenSeleccionado = null;
      this.cdr.markForCheck();
      return;
    }

    localStorage.setItem('cbSucursal', String(idSucursal));
    if (limpiarAlmacen) {
      this.almacenSeleccionado = null;
      localStorage.removeItem('cbAlmacen');
    }

    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.almacenes = response.map((item: any) => ({
            label: item.nombre,
            value: String(item.id ?? '')
          }));
        }

        if (this.almacenSeleccionado && this.almacenes.some(x => x.value === this.almacenSeleccionado)) {
          this.cdr.markForCheck();
          return;
        }

        if (this.almacenes.length > 0) {
          this.almacenSeleccionado = this.almacenes[0].value;
          localStorage.setItem('cbAlmacen', this.almacenSeleccionado);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los almacenes',
          life: 4000
        });
        this.cdr.markForCheck();
      }
    });
  }

  cambiarAlmacen(idAlmacen: string | null) {
    this.almacenSeleccionado = idAlmacen;
    if (idAlmacen) {
      localStorage.setItem('cbAlmacen', idAlmacen);
    }
  }

  abrirScanner() {
    this.modalVisible = true;
    this.scannerActivo = true;
  }

  cerrarScanner() {
    this.scannerActivo = false;
    this.modalVisible = false;
  }

  onScanSuccess(vin: string) {
    if (!vin) return;
    this.agregarVehiculo(vin);
  }

  agregarVinManual() {
    if (!this.vinManual.trim()) return;
    this.agregarVehiculo(this.vinManual);
    this.vinManual = '';
  }

  async agregarVehiculo(rawVin: string) {
    let vin = rawVin.replace(/\s+/g, ' ').trim();
    if (vin.includes(' ')) {
      vin = vin.split(' ')[1];
    }

    try {
      const data = await firstValueFrom(this.api.getVehiculoPorVinRecepcion(vin));
      if (!data || Object.keys(data).length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'VIN no encontrado',
          detail: `NO SE PUDO RECONOCER EL NRO DE VIN ${vin} EN EL SISTEMA`,
          life: 4000
        });
        return;
      }

      this.vehiculos = [data, ...this.vehiculos.filter(v => v.vin !== data.vin)];
      this.cerrarScanner();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `NO SE PUDO RECONOCER EL NRO DE VIN ${vin} EN EL SISTEMA`,
        life: 4000
      });
    }
  }

  reiniciar() {
    this.vehiculos = [];
    this.documentoGenerado = '';
    this.vinManual = '';
    this.fechaSeleccionada = new Date();
    this.abrirScanner();
  }

  nuevoScaneo() {
    this.documentoGenerado = '';
    this.vinManual = '';
    this.fechaSeleccionada = new Date();
    this.abrirScanner();
  }

  async guardar() {
    if (this.vehiculos.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay vehículos en la lista para guardar.',
        life: 3000
      });
      return;
    }

    if (!this.sucursalSeleccionada || !this.almacenSeleccionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Faltan datos',
        detail: 'Selecciona Sucursal y Almacén antes de guardar.',
        life: 3000
      });
      return;
    }

    this.guardando = true;
    const fecha = this.fechaSeleccionada.toISOString().split('T')[0];
    const resultados: DocumentoRecepcion[] = [];

    for (const vehiculo of this.vehiculos) {
      const payload: VehiculoRecepcionPayload = {
        idEmpresa: '001',
        idVehiculo: vehiculo.idVehiculo,
        idSucursal: this.sucursalSeleccionada,
        idAlmacen: this.almacenSeleccionado,
        fecha
      };

      try {
        const response = await firstValueFrom(this.api.guardarVehiculoRecepcion(payload));
        resultados.push(response);
      } catch {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: `No se pudo guardar el vehículo stock ${vehiculo.idVehiculo}`,
          life: 4000
        });
      }
    }

    this.documentoGenerado = resultados
      .map(d => [d.tipoDoc, d.serie, d.numeroDocumento].filter(Boolean).join('-'))
      .filter(Boolean)
      .join(' | ');

    this.guardando = false;

    if (resultados.length > 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Se registraron los vehículos correctamente',
        life: 3000
      });
    }
  }
}

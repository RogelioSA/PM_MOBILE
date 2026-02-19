import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Menu } from '../menu/menu';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Master } from '../services/master';

interface Opcion {
  label: string;
  value: string;
}

@Component({
  selector: 'app-ingresosalidataller',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Menu,
    SelectModule,
    ButtonModule,
    InputTextModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './ingresosalidataller.html',
  styleUrl: './ingresosalidataller.css'
})
export class Ingresosalidataller implements OnInit {
  form!: FormGroup;

  sucursales: Opcion[] = [];
  almacenes: Opcion[] = [];

  constructor(
    private fb: FormBuilder,
    private master: Master,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sucursal: [null, Validators.required],
      almacen: [null, Validators.required],
      chasis: ['', Validators.required],
      placa: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.cargarSucursales();

    this.form.get('sucursal')?.valueChanges.subscribe(idSucursal => {
      this.almacenes = [];
      this.form.get('almacen')?.reset();
      this.form.get('chasis')?.reset();

      if (idSucursal) {
        this.cargarAlmacenesPorSucursal(idSucursal);
      }
    });

    this.form.get('almacen')?.valueChanges.subscribe(() => {
      this.form.get('chasis')?.reset();
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

  cargarAlmacenesPorSucursal(idSucursal: string) {
    this.master.getAlmacenesPorSucursal(idSucursal).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.almacenes = response.map((item: any) => ({
            label: item.nombre,
            value: item.id
          }));
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los almacenes',
          life: 3000
        });
      }
    });
  }

  onPlacaInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/\D/g, '').slice(0, 6);
    this.form.get('placa')?.setValue(soloDigitos, { emitEvent: false });
  }

  registrarIngreso() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Complete sucursal, almacén, Nro de Chasis y placa (6 dígitos)',
        life: 3000
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Listo',
      detail: 'Ingreso listo para registrar',
      life: 3000
    });
  }
}

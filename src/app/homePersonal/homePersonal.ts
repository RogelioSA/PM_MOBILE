import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Api } from '../services/api';

interface MenuPersonal {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  color: string;
}

interface PersonalNisira {
  nombres: string;
  apellido_Paterno: string;
  apellido_Materno: string;
}

@Component({
  selector: 'app-home-personal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './homePersonal.html',
  styleUrl: './homePersonal.css'
})
export class HomePersonal implements OnInit {
  usuario = '';
  personalSeleccionado: PersonalNisira | null = null;
  cargandoPersonal = false;

  menus: MenuPersonal[] = [
    {
      titulo: 'Actualización de Datos',
      descripcion: 'Mantén tus datos personales, contacto y dirección al día.',
      icono: 'pi pi-user-edit',
      ruta: '/editarDatos',
      color: 'primary'
    },
    {
      titulo: 'Mis Marcaciones',
      descripcion: 'Consulta tus entradas, salidas, tardanzas y ubicación registrada.',
      icono: 'pi pi-clock',
      ruta: '/personalMarcacion',
      color: 'success'
    },
    {
      titulo: 'Mis Justificaciones',
      descripcion: 'Revisa y registra tus solicitudes de justificación.',
      icono: 'pi pi-file-edit',
      ruta: '/misJustificaciones',
      color: 'warning'
    },
    {
      titulo: 'Vacaciones',
      descripcion: 'Consulta tu saldo y solicitudes de vacaciones.',
      icono: 'pi pi-calendar',
      ruta: '/misVacaciones',
      color: 'info'
    }
  ];

  constructor(
    private router: Router,
    private apiService: Api
  ) {}

  ngOnInit(): void {
    this.usuario = this.getCookie('usuario') || '';

    if (this.usuario) {
      this.cargarPersonalPorDocumento(this.usuario);
    }
  }

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }

  getNombreCompleto(): string {
    if (!this.personalSeleccionado) return 'USUARIO';
    const p = this.personalSeleccionado;
    return `${p.nombres ?? ''} ${p.apellido_Paterno ?? ''} ${p.apellido_Materno ?? ''}`.trim();
  }

  private cargarPersonalPorDocumento(documento: string): void {
    this.cargandoPersonal = true;

    this.apiService.listarPersonal(documento, '', '', 1, 1).subscribe({
      next: (response) => {
        this.cargandoPersonal = false;
        this.personalSeleccionado = response?.success && response?.data?.length > 0
          ? response.data[0]
          : null;
      },
      error: () => {
        this.cargandoPersonal = false;
        this.personalSeleccionado = null;
      }
    });
  }

  private getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? '';
    return '';
  }
}

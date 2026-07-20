import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface MenuPersonal {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  color: string;
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.usuario = this.getCookie('usuario') || 'USUARIO';
  }

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }

  private getCookie(name: string): string | null {
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const item = cookie.trim();
      if (item.indexOf(nameEQ) === 0) {
        return item.substring(nameEQ.length);
      }
    }

    return null;
  }
}

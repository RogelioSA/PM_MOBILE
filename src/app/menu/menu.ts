// menu.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface MenuItemExtended extends MenuItem {
  route?: string;
  icon?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, DrawerModule, ButtonModule, TooltipModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit {
  items: MenuItemExtended[] = [];
  isDarkMode = false;
  drawerVisible = false;
  currentRoute = '';

  constructor(private router: Router) {
    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url.replace('/', '');
        this.updateActiveItem();
      });
  }

  ngOnInit() {
    this.items = [
      {
        label: 'Recepción de Vehículos',
        icon: 'pi pi-car',
        route: 'recepcionvehiculos',
        command: () => this.navigateTo('recepcionvehiculos')
      },
      {
        label: 'Traslado entre Establecimientos',
        icon: 'pi pi-arrow-right-arrow-left',
        route: 'traslado',
        command: () => this.navigateTo('traslado')
      },
      {
        label: 'Salida por Orden de Trabajo',
        icon: 'pi pi-sign-out',
        route: 'salidaTrabajo',
        command: () => this.navigateTo('salidaTrabajo')
      },
      {
        label: 'Checklist PDI',
        icon: 'pi pi-check-square',
        route: 'checklist',
        command: () => this.navigateTo('checklist')
      },
      {
        label: 'Ingreso/Salida Taller',
        icon: 'pi pi-wrench',
        route: 'ingresosalidataller',
        command: () => this.navigateTo('ingresosalidataller')
      },
      {
        label: 'Listar Checklist',
        icon: 'pi pi-list',
        route: 'listarchecklist',
        command: () => this.navigateTo('listarchecklist')
      },
      {
        label: 'Mantenimiento',
        icon: 'pi pi-cog',
        route: 'mantenimiento',
        command: () => this.navigateTo('mantenimiento')
      },
      {
        label: 'Gestor Mantenimiento',
        icon: 'pi pi-sliders-h',
        route: 'mantenimientoestados',
        command: () => this.navigateTo('mantenimientoestados')
      },
      {
        label: 'Rendición de gastos',
        icon: 'pi pi-dollar',
        route: 'rendicion-gastos',
        command: () => this.navigateTo('rendicion-gastos')
      },
    ];

    // Cargar tema desde localStorage
    this.loadTheme();

    // Actualizar item activo inicial
    this.currentRoute = this.router.url.replace('/', '');
    this.updateActiveItem();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';

    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;

    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  toggleDrawer() {
    this.drawerVisible = !this.drawerVisible;
  }

  executeCommand(item: MenuItemExtended) {
    if (item.command) {
      item.command({});
    }
  }

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
    this.drawerVisible = false;
  }

  updateActiveItem() {
    this.items.forEach(item => {
      item.isActive = item.route === this.currentRoute;
    });
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  getButtonClass(item: MenuItemExtended): string {
    const baseClasses = 'p-button-text justify-start w-full h-12';

    if (this.isActive(item.route || '')) {
      return `${baseClasses} active-menu-item`;
    }

    return baseClasses;
  }
}

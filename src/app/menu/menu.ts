// menu.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Api } from '../services/api';
import { Auth } from '../services/auth';

interface MenuItemExtended extends MenuItem {
  route?: string;
  icon?: string;
  isActive?: boolean;
}

// Catálogo completo de items — se filtra según permisos
const ALL_ITEMS: MenuItemExtended[] = [
  { label: 'Recepción de Vehículos',         icon: 'pi pi-car',                    route: 'recepcionvehiculos'  },
  { label: 'Traslado entre Establecimientos', icon: 'pi pi-arrow-right-arrow-left', route: 'traslado'            },
  { label: 'Salida por Orden de Trabajo',     icon: 'pi pi-sign-out',               route: 'salidaTrabajo'       },
  { label: 'Checklist PDI',                   icon: 'pi pi-check-square',           route: 'checklist'           },
  { label: 'Ingreso/Salida Taller',           icon: 'pi pi-wrench',                 route: 'ingresosalidataller' },
  { label: 'Listar Checklist',                icon: 'pi pi-list',                   route: 'listarchecklist'     },
  { label: 'Mantenimiento',                   icon: 'pi pi-cog',                    route: 'mantenimiento'       },
  { label: 'Gestor Mantenimiento',            icon: 'pi pi-sliders-h',              route: 'mantenimientoestados'},
  { label: 'Rendición de gastos',             icon: 'pi pi-dollar',                 route: 'rendicion-gastos'    },
  { label: 'Personal',                        icon: 'pi pi-id-card',                route: 'personal'            },
];

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
  cargandoPermisos = false;

  constructor(
    private router: Router,
    private apiService: Api,
     private authService: Auth
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url.replace('/', '');
        this.updateActiveItem();
      });
  }

  ngOnInit() {
    this.loadTheme();
    this.currentRoute = this.router.url.replace('/', '');
    this.cargarPermisos();
  }

  // ── Permisos ──────────────────────────────────────────────────────────────
  cargarPermisos() {
  this.cargandoPermisos = true;

  // Obtén el idUsuario desde cookies — ajusta según tu authService
  const idUsuario = this.authService.getUsuario();
  if (!idUsuario) {
    this.cargandoPermisos = false;
    this.items = [];
    return;
  }
  const idAplicacion = 'MOB';

  this.apiService.obtenerPermisosUsuario(idUsuario, idAplicacion).subscribe({
    next: (response) => {
      this.cargandoPermisos = false;

      if (response?.success && Array.isArray(response.data)) {
        // La API devuelve nombre en UPPERCASE, compara en lowercase
        const rutasPermitidas: string[] = response.data
          .map((m: any) => m.nombre.toLowerCase());

        this.items = ALL_ITEMS
          .filter(item => rutasPermitidas.includes(item.route?.toLowerCase() ?? ''))
          .map(item => ({
            ...item,
            command: () => this.navigateTo(item.route!)
          }));
      } else {
        this.items = [];
      }

      this.updateActiveItem();
    },
    error: () => {
      this.cargandoPermisos = false;
      this.items = [];       // en error, menú vacío (más seguro que mostrar todo)
      this.updateActiveItem();
    }
  });
}

  // ── Tema ──────────────────────────────────────────────────────────────────
  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  // ── Drawer / navegación ───────────────────────────────────────────────────
  toggleDrawer() {
    this.drawerVisible = !this.drawerVisible;
  }

  executeCommand(item: MenuItemExtended) {
    if (item.command) item.command({});
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
    const base = 'p-button-text justify-start w-full h-12';
    return this.isActive(item.route ?? '') ? `${base} active-menu-item` : base;
  }
}
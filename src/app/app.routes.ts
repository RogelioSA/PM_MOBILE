import { Routes } from '@angular/router';
import { Login } from './login/login';
import { SalidaTrabajo } from './salida-trabajo/salida-trabajo';
import { authGuard } from './services/auth.guard';
import { Traslado } from './traslado/traslado';
import { Checklist } from './checklist/checklist';
import { Listarchecklist } from './listarchecklist/listarchecklist';
import { Detallechecklist } from './detallechecklist/detallechecklist';
import { Recepcionvehiculos } from './recepcionvehiculos/recepcionvehiculos';
import { Ingresosalidataller } from './ingresosalidataller/ingresosalidataller';
import { Mantenimiento } from './mantenimiento/mantenimiento';
import { MantenimientoEstados } from './mantenimiento-estados/mantenimiento-estados';
import { Viaticos } from './viaticos/viaticos';
import { RendicionGastos } from './rendicion-gastos/rendicion-gastos';
import { Home } from './home/home';
import { Personal } from './personal/personal';

export const routes: Routes = [
  // Ruta por defecto
  {
    path: '',
    component: Login
  },

  // Ruta protegida
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard]
  },

  {
    path: 'salidaTrabajo',
    component: SalidaTrabajo,
    canActivate: [authGuard]  // 🔒 Protección
  },


  {
    path: 'recepcionvehiculos',
    component: Recepcionvehiculos,
    canActivate: [authGuard]
  },

  {
    path: 'traslado',
    component: Traslado,
    canActivate: [authGuard]  // 🔒 Protección
  },

  {
    path: 'checklist',
    component: Checklist,
    canActivate: [authGuard]  // 🔒 Protección
  },

  {
    path: 'listarchecklist',
    component: Listarchecklist,
    canActivate: [authGuard]  // 🔒 Protección
  },
  {
    path: 'detallechecklist/:id',
    component: Detallechecklist,
    canActivate: [authGuard]
  },
  {
    path: 'ingresosalidataller',
    component: Ingresosalidataller,
    canActivate: [authGuard]
  },
  {
    path: 'mantenimiento',
    component: Mantenimiento,
    canActivate: [authGuard]
  },
  {
    path: 'mantenimientoestados',
    component: MantenimientoEstados,
    canActivate: [authGuard]
  },
  {
    path: 'solicitud-viaticos',
    component: Viaticos,
    canActivate: [authGuard]
  },
  {
    path: 'rendicion-gastos',
    component: RendicionGastos,
    canActivate: [authGuard]
  },
  {
    path: 'personal',
    component: Personal,
    canActivate: [authGuard]
  },
  // Cualquier ruta no válida vuelve al login
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
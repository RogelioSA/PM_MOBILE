import { Routes } from '@angular/router';
import { Login } from './login/login';
import { SalidaTrabajo } from './salida-trabajo/salida-trabajo';
import { authGuard } from './services/auth.guard';
import { Traslado } from './traslado/traslado';
import { Checklist } from './checklist/checklist';
import { Listarchecklist } from './listarchecklist/listarchecklist';
import { Detallechecklist } from './detallechecklist/detallechecklist';
import { Recepcionvehiculos } from './recepcionvehiculos/recepcionvehiculos';

export const routes: Routes = [
  // Ruta por defecto
  {
    path: '',
    component: Login
  },

  // Ruta protegida
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
  // Cualquier ruta no válida vuelve al login
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
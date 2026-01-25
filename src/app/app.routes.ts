import { Routes } from '@angular/router';
import { Login } from './login/login';
import { SalidaTrabajo } from './salida-trabajo/salida-trabajo';
import { authGuard } from './services/auth.guard';
import { Traslado } from './traslado/traslado';
import { Checklist } from './checklist/checklist';

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
    path: 'traslado',
    component: Traslado,
    canActivate: [authGuard]  // 🔒 Protección
  },

  {
    path: 'checklist',
    component: Checklist,
    canActivate: [authGuard]  // 🔒 Protección
  },

  // Cualquier ruta no válida vuelve al login
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
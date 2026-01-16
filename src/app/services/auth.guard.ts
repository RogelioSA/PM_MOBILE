import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Función para obtener cookie
  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  };
  
  const token = getCookie('token');
  
  if (token) {
    console.log('✅ Token encontrado, acceso permitido');
    return true;
  } else {
    console.warn('❌ No hay token, redirigiendo a login');
    router.navigate(['/']);
    return false;
  }
};
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Obtener token desde cookie
  getToken(): string | null {
    const name = 'token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  }

  // Obtener headers con token
  getHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Login
  iniciarSesion(usuario: string, clave: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/AuthReport/IniciarSesion`,
      {
        params: new HttpParams()
          .set('usuario', usuario)
          .set('clave', clave)
      }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }

  iniciarSesionDocumento(
    tipoDocumento: string,
    documento: string,
    fechaNacimiento: string,
    digitoVerificador?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('tipoDocumento', tipoDocumento)
      .set('documento', documento)
      .set('fechaNacimiento', fechaNacimiento);

    const digito = (digitoVerificador ?? '').trim();
    if (digito) {
      params = params.set('digitoVerificador', digito);
    }

    return this.http.get(
      `${this.baseUrl}/AuthReport/IniciarSesionDocumento`,
      { params }
    ).pipe(
      map((response: any) => response),
      catchError(error => throwError(() => error))
    );
  }


  getUsuario(): string | null {
  const name = 'usuario=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

  // Logout
  logout(): void {
    const hostnameParts = window.location.hostname.split('.');
    const domains = hostnameParts.map((_, index) => `.${hostnameParts.slice(index).join('.')}`);
    const paths = window.location.pathname
      .split('/')
      .reduce<string[]>((acc, segment) => {
        if (!segment) return acc;
        const previousPath = acc[acc.length - 1] ?? '';
        acc.push(`${previousPath}/${segment}`);
        return acc;
      }, ['/']);

    document.cookie.split(';').forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      if (!cookieName) return;

      paths.forEach(path => {
        document.cookie = `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        domains.forEach(domain => {
          document.cookie = `${cookieName}=; path=${path}; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        });
      });
    });

    localStorage.clear();
    sessionStorage.clear();
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}

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

  // Logout
  logout(): void {
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'usuario=; path=/; max-age=0';
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}

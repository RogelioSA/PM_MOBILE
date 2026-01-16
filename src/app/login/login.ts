import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Auth } from '../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule
  ],
  templateUrl: './login.html'
})
export class Login implements OnInit {

  loading = false;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router
  ) {
    this.form = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Si ya tiene token, redirigir directamente
    const token = this.getCookie('token');
    if (token) {
      console.log('✅ Ya tiene sesión activa');
      this.router.navigate(['/salidaTrabajo']);
    }
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  iniciarSesion() {
    if (this.form.invalid || this.loading) return;

    this.loading = true;

    const { usuario, password } = this.form.value;

    this.auth.iniciarSesion(usuario, password).subscribe({
      next: (response) => {
        if (response?.success && response?.data?.token) {

          // Guardar token (24 horas)
          document.cookie = `token=${response.data.token}; path=/; max-age=${60 * 60 * 24}`;
          document.cookie = `usuario=${response.data.usuario}; path=/; max-age=${60 * 60 * 24}`;

          console.log('✅ Login exitoso');
          this.router.navigate(['/salidaTrabajo']);

        } else {
          console.warn('❌ Credenciales incorrectas');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error en login', error);
        this.loading = false;
      }
    });
  }
}
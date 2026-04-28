import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-login-documento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    DatePickerModule
  ],
  templateUrl: './login-documento.html',
  styleUrls: ['./login-documento.css']
})
export class LoginDocumento implements OnInit {
  loading = false;
  form: FormGroup;
  maxFechaNacimiento = new Date();
  tiposDocumento = [
    { label: 'DNI', value: 'DNI' },
    { label: 'CE', value: 'CE' }
  ];
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router
  ) {
    this.form = this.fb.group({
      tipoDocumento: ['DNI', Validators.required],
      documento: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      digitoVerificador: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const token = this.getCookie('token');
    if (token) {
      this.router.navigate(['/editarDatos']);
    }
  }

  iniciarSesion(): void {
    if (this.form.invalid || this.loading) return;

    this.mensajeError = '';
    this.loading = true;

    const { tipoDocumento, documento, fechaNacimiento, digitoVerificador } = this.form.value;
    const documentoLimpio = `${documento ?? ''}`.trim();

    this.auth.iniciarSesionDocumento(
      tipoDocumento,
      documentoLimpio,
      fechaNacimiento,
      digitoVerificador
    ).subscribe({
      next: (response) => {
        const token = response?.data?.token ?? response?.data?.Token;

        if (response?.success && token) {
          document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}`;
          document.cookie = `usuario=${documentoLimpio}; path=/; max-age=${60 * 60 * 24}`;
          this.router.navigate(['/editarDatos']);
          return;
        }

        this.mensajeError = response?.message ?? 'No se pudo iniciar sesión.';
        this.loading = false;
      },
      error: (error) => {
        this.mensajeError = error?.error?.message ?? 'Error al iniciar sesión.';
        this.loading = false;
      }
    });
  }

  getLabelDocumento(): string {
    return this.form.get('tipoDocumento')?.value === 'CE' ? 'Carné de extranjería' : 'DNI';
  }

  getPlaceholderDocumento(): string {
    return this.form.get('tipoDocumento')?.value === 'CE' ? 'Ingrese CE' : 'Ingrese DNI';
  }

  private getCookie(name: string): string | null {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }
}

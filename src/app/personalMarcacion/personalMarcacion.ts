import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

type TipoEvento = 'entrada' | 'salida';

interface RegistroAsistencia {
  id: number;
  fecha: Date;
  fechaJornal: Date;
  tipoEvento: TipoEvento;
  horaProgramada: string;
  esTardanza: boolean;
  diferenciaMinutos: number;
  latitud: number;
  longitud: number;
  ubicacion: string;
}

@Component({
  selector: 'app-personal-marcacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './personalMarcacion.html',
  styleUrl: './personalMarcacion.css'
})
export class PersonalMarcacion {
  fechaBase = new Date();
  mostrarModalMapa = false;
  coordenadasSeleccionadas: RegistroAsistencia | null = null;

  registrosAsistencia: RegistroAsistencia[] = [
    { id: 1, fecha: new Date(2026, 6, 20, 8, 8), fechaJornal: new Date(2026, 6, 20), tipoEvento: 'entrada', horaProgramada: '08:00', esTardanza: true, diferenciaMinutos: 8, latitud: -16.3985482, longitud: -71.5374206, ubicacion: 'Sede principal' },
    { id: 2, fecha: new Date(2026, 6, 20, 18, 2), fechaJornal: new Date(2026, 6, 20), tipoEvento: 'salida', horaProgramada: '18:00', esTardanza: false, diferenciaMinutos: 2, latitud: -16.3985482, longitud: -71.5374206, ubicacion: 'Sede principal' },
    { id: 3, fecha: new Date(2026, 6, 19, 7, 55), fechaJornal: new Date(2026, 6, 19), tipoEvento: 'entrada', horaProgramada: '08:00', esTardanza: false, diferenciaMinutos: 0, latitud: -16.3991, longitud: -71.5369, ubicacion: 'Taller' },
    { id: 4, fecha: new Date(2026, 6, 19, 18, 0), fechaJornal: new Date(2026, 6, 19), tipoEvento: 'salida', horaProgramada: '18:00', esTardanza: false, diferenciaMinutos: 0, latitud: -16.3991, longitud: -71.5369, ubicacion: 'Taller' }
  ];

  get mesActual(): string {
    return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(this.fechaBase);
  }

  get totalRegistros(): number { return this.registrosFiltrados.length; }
  get registrosEntrada(): number { return this.registrosFiltrados.filter((r) => r.tipoEvento === 'entrada').length; }
  get registrosSalida(): number { return this.registrosFiltrados.filter((r) => r.tipoEvento === 'salida').length; }
  get totalTardanzas(): number { return this.registrosFiltrados.filter((r) => r.esTardanza).length; }
  get minutosAcumulados(): number { return this.registrosFiltrados.reduce((total, r) => total + (r.esTardanza ? r.diferenciaMinutos : 0), 0); }
  get registrosFiltrados(): RegistroAsistencia[] { return this.registrosAsistencia.filter((r) => r.fecha.getMonth() === this.fechaBase.getMonth() && r.fecha.getFullYear() === this.fechaBase.getFullYear()); }

  cambiarMes(valor: number): void { this.fechaBase = new Date(this.fechaBase.getFullYear(), this.fechaBase.getMonth() + valor, 1); }
  mostrarMapa(registro: RegistroAsistencia): void { this.coordenadasSeleccionadas = registro; this.mostrarModalMapa = true; }
  cerrarMapa(): void { this.mostrarModalMapa = false; this.coordenadasSeleccionadas = null; }
  obtenerNombreTipoEvento(tipo: TipoEvento): string { return tipo === 'entrada' ? 'Entrada' : 'Salida'; }
  obtenerColorTipoEvento(tipo: TipoEvento): string { return tipo === 'entrada' ? 'success' : 'danger'; }
}

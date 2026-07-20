import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({ selector: 'app-mis-justificaciones', standalone: true, imports: [CommonModule, RouterModule], templateUrl: './misJustificaciones.html', styleUrl: './misJustificaciones.css' })
export class MisJustificaciones {
  justificaciones = [
    { fecha: '2026-07-15', tipo: 'Tardanza', estado: 'Aprobada', detalle: 'Tráfico por cierre de vía.' },
    { fecha: '2026-07-10', tipo: 'Inasistencia', estado: 'Pendiente', detalle: 'Cita médica.' }
  ];
}

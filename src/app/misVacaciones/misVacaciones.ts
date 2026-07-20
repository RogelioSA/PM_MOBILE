import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({ selector: 'app-mis-vacaciones', standalone: true, imports: [CommonModule, RouterModule], templateUrl: './misVacaciones.html', styleUrl: './misVacaciones.css' })
export class MisVacaciones {
  saldoDias = 12;
  solicitudes = [
    { periodo: '2026-08-05 al 2026-08-09', dias: 5, estado: 'Pendiente' },
    { periodo: '2026-05-02 al 2026-05-06', dias: 5, estado: 'Aprobada' }
  ];
}

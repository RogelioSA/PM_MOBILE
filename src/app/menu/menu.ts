import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, DrawerModule, ButtonModule, TooltipModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit {
  items: MenuItem[] = [];
  isDarkMode = false;
  drawerVisible = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.items = [
      {
        label: 'Recepción de Vehículos',
        command: () => this.navigateTo('recepcion')
      },
      {
        label: 'Traslado entre Establecimientos',
        command: () => this.navigateTo('traslado')
      },
      {
        label: 'Salida por Orden de Trabajo',
        command: () => this.navigateTo('salida-trabajo')
      }
    ];

    // Cargar tema desde localStorage
    this.loadTheme();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';
    
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  toggleDrawer() {
    this.drawerVisible = !this.drawerVisible;
  }

  executeCommand(item: MenuItem) {
    if (item.command) {
      item.command({});
    }
  }

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
    this.drawerVisible = false;
  }
}
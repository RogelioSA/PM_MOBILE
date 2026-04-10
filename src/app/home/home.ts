import { Component, OnInit } from '@angular/core';
import { Menu } from '../menu/menu';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Menu],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  usuario = '';

  ngOnInit(): void {
    this.usuario = this.getCookie('usuario') || 'USUARIO';
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

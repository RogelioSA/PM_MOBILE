import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
bootstrapApplication(App, {
  ...appConfig,              // 👉 conservas tu configuración previa
  providers: [
    ...(appConfig.providers || []), // 👉 por si ya tenías otros providers
    provideHttpClient()             // 👉 aquí registras HttpClient
  ]
})
.catch((err) => console.error(err));
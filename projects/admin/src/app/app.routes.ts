import { Routes } from '@angular/router';
import { platformGuard } from './platform/platform.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Acceso operador · Comanda',
    loadComponent: () => import('./platform/platform-login.component').then((m) => m.PlatformLoginComponent),
  },
  {
    path: '',
    title: 'Plataforma · Comanda',
    canActivate: [platformGuard],
    loadComponent: () => import('./platform/platform-dashboard.component').then((m) => m.PlatformDashboardComponent),
  },
  { path: '**', redirectTo: '' },
];

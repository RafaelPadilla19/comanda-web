import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard } from './core/api/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Comanda',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Comanda',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  // El super-admin (control-plane) vive en una app aparte (proyecto "admin", dominio propio).
  // ---- Tienda pública (QR) — sin sesión ni shell ----
  {
    path: 'tienda/:slug',
    title: 'Pedir en línea · Comanda',
    loadComponent: () =>
      import('./storefront/store-landing.component').then((m) => m.StoreLandingComponent),
  },
  {
    path: 't/:branchId',
    title: 'Menú · Comanda',
    loadComponent: () =>
      import('./storefront/storefront.component').then((m) => m.StorefrontComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Comanda',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'pos',
        title: 'Punto de venta · Comanda',
        loadComponent: () => import('./features/pos/pos.component').then((m) => m.PosComponent),
      },
      {
        path: 'pedidos',
        title: 'Pedidos · Comanda',
        loadComponent: () =>
          import('./features/orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: 'caja',
        title: 'Caja · Comanda',
        loadComponent: () => import('./features/caja/caja.component').then((m) => m.CajaComponent),
      },
      {
        path: 'menu',
        title: 'Menú digital · Comanda',
        loadComponent: () => import('./features/menu/menu.component').then((m) => m.MenuComponent),
      },
      {
        path: 'inventario',
        title: 'Inventario · Comanda',
        loadComponent: () =>
          import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
      },
      {
        path: 'clientes',
        title: 'Clientes · Comanda',
        loadComponent: () =>
          import('./features/customers/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'reportes',
        title: 'Reportes · Comanda',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'inteligencia',
        title: 'Inteligencia · Comanda',
        loadComponent: () =>
          import('./features/insights/insights.component').then((m) => m.InsightsComponent),
      },
      {
        path: 'pagos',
        title: 'Métodos de pago · Comanda',
        loadComponent: () =>
          import('./features/payments/payments.component').then((m) => m.PaymentsComponent),
      },
      {
        path: 'suscripcion',
        title: 'Suscripción · Comanda',
        loadComponent: () =>
          import('./features/billing/billing.component').then((m) => m.BillingComponent),
      },
      {
        path: 'configuracion',
        title: 'Configuración · Comanda',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];

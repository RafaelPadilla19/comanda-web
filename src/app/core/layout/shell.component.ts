import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { ComandaStore } from '@core/store';
import { AuthService } from '@core/api/auth.service';
import { SafeHtmlPipe } from '@shared/safe-html.pipe';
import { icon } from '@shared/icons';
import { ScreenKey } from '@shared/models';

interface NavLink {
  key: ScreenKey;
  path: string;
  label: string;
  iconName: string;
  badge?: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, SafeHtmlPipe, FormsModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent implements OnInit {
  protected readonly store = inject(ComandaStore);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Refresca el usuario (incluye el nombre del restaurante) para sesiones previas.
    this.auth.me().subscribe({ error: () => {} });
    // Carga datos para alimentar las notificaciones desde cualquier pantalla.
    this.store.loadInventory();
    this.store.loadOrders();
    this.store.loadCaja();
  }

  private readonly url = signal(this.router.url);

  /** Suscripción vencida (PastDue): la app se limita a la pantalla de Suscripción hasta pagar. */
  protected readonly isPastDue = computed(() => this.auth.currentUser()?.subscriptionStatus === 'PastDue');

  protected readonly restaurantName = computed(() => this.auth.currentUser()?.tenantName || 'Mi restaurante');
  protected readonly userName = computed(() => this.auth.currentUser()?.name ?? 'Invitado');
  protected readonly userRole = computed(() => this.auth.currentUser()?.role ?? '');
  protected readonly userInitials = computed(() => {
    const n = this.auth.currentUser()?.name ?? 'IN';
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'IN';
  });

  // Drawer móvil
  protected readonly menuOpen = signal(false);
  protected toggleMenu(): void { this.menuOpen.update((v) => !v); }
  protected closeMenu(): void { this.menuOpen.set(false); }

  // ---- Buscador global ----
  protected readonly query = signal('');

  private readonly searchIndex: { label: string; sub: string; path: string; emoji: string }[] = [
    { label: 'Dashboard', sub: 'Resumen del día', path: '/dashboard', emoji: '📊' },
    { label: 'Punto de venta', sub: 'Cobrar y crear pedidos', path: '/pos', emoji: '🧾' },
    { label: 'Pedidos', sub: 'Tablero de cocina', path: '/pedidos', emoji: '📋' },
    { label: 'Caja', sub: 'Arqueo y movimientos', path: '/caja', emoji: '💵' },
    { label: 'Menú digital', sub: 'Productos y categorías', path: '/menu', emoji: '🍽️' },
    { label: 'Inventario', sub: 'Insumos y stock', path: '/inventario', emoji: '📦' },
    { label: 'Clientes', sub: 'CRM e historial de pedidos', path: '/clientes', emoji: '🧑' },
    { label: 'Reportes', sub: 'Ventas y análisis', path: '/reportes', emoji: '📈' },
    { label: 'Inteligencia', sub: 'Hallazgos y combos sugeridos', path: '/inteligencia', emoji: '✨' },
    { label: 'Métodos de pago', sub: 'Cómo te pagan tus clientes', path: '/pagos', emoji: '💳' },
    { label: 'Suscripción', sub: 'Tu plan y facturación', path: '/suscripcion', emoji: '🎟️' },
    { label: 'Configuración', sub: 'Usuarios, impresoras, sucursales', path: '/configuracion', emoji: '⚙️' },
  ];

  protected readonly searchResults = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const inv = this.auth.hasFeature('inventory');
    return this.searchIndex
      .filter((s) => s.path !== '/inventario' || inv)
      .filter((s) => s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q));
  });

  protected goTo(path: string): void {
    this.query.set('');
    this.router.navigateByUrl(path);
  }

  // ---- Notificaciones ----
  protected readonly notifOpen = signal(false);
  protected toggleNotif(): void { this.notifOpen.update((v) => !v); }

  protected readonly notifications = computed(() => {
    const items: { icon: string; tint: string; title: string; sub: string; path: string }[] = [];
    const nuevos = this.store.orders().nuevos.length;
    if (nuevos > 0) {
      items.push({ icon: '🛎️', tint: 'var(--blue-soft)', title: `${nuevos} pedido${nuevos === 1 ? '' : 's'} nuevo${nuevos === 1 ? '' : 's'}`, sub: 'Esperando preparación', path: '/pedidos' });
    }
    for (const i of this.store.inventory()) {
      if (i.stock < i.min) {
        items.push({ icon: '⚠️', tint: 'var(--red-soft)', title: `Stock crítico: ${i.name}`, sub: `Quedan ${i.stock} ${i.unit}`, path: '/inventario' });
      }
    }
    if (!this.store.caja().open) {
      items.push({ icon: '🔒', tint: 'var(--amber-soft)', title: 'Caja cerrada', sub: 'Ábrela para registrar ventas', path: '/caja' });
    }
    return items;
  });

  protected readonly notifCount = computed(() => this.notifications().length);

  protected openNotif(path: string): void {
    this.notifOpen.set(false);
    this.router.navigateByUrl(path);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  /** Pedidos "nuevos" reales (badge dinámico; vacío si no hay). */
  protected readonly navMain = computed<NavLink[]>(() => {
    const nuevos = this.store.orders().nuevos.length;
    return [
      { key: 'dashboard', path: '/dashboard', label: 'Dashboard', iconName: 'dashboard' },
      { key: 'pos', path: '/pos', label: 'Punto de venta', iconName: 'pos' },
      { key: 'pedidos', path: '/pedidos', label: 'Pedidos', iconName: 'orders', badge: nuevos > 0 ? String(nuevos) : undefined },
      { key: 'caja', path: '/caja', label: 'Caja', iconName: 'caja' },
    ];
  });

  protected readonly navManage: NavLink[] = [
    { key: 'menu', path: '/menu', label: 'Menú digital', iconName: 'menu' },
    { key: 'inventario', path: '/inventario', label: 'Inventario', iconName: 'inventory' },
    { key: 'clientes', path: '/clientes', label: 'Clientes', iconName: 'users' },
    { key: 'reportes', path: '/reportes', label: 'Reportes', iconName: 'reports' },
    { key: 'inteligencia', path: '/inteligencia', label: 'Inteligencia', iconName: 'sparkles' },
    { key: 'pagos', path: '/pagos', label: 'Métodos de pago', iconName: 'caja' },
    { key: 'suscripcion', path: '/suscripcion', label: 'Suscripción', iconName: 'ticket' },
    { key: 'configuracion', path: '/configuracion', label: 'Configuración', iconName: 'settings' },
  ];

  /** Oculta del menú las secciones que el plan del restaurante no incluye (hoy: Inventario). */
  protected readonly navManageVisible = computed(() =>
    this.navManage.filter((n) => n.key !== 'inventario' || this.auth.hasFeature('inventory')),
  );

  private readonly titles: Record<ScreenKey, string> = {
    dashboard: 'Dashboard', pos: 'Punto de venta', pedidos: 'Pedidos', caja: 'Caja',
    menu: 'Menú digital', inventario: 'Inventario', clientes: 'Clientes', reportes: 'Reportes',
    inteligencia: 'Inteligencia', pagos: 'Métodos de pago', suscripcion: 'Suscripción', configuracion: 'Configuración',
  };

  protected readonly current = computed<ScreenKey>(() => {
    const seg = this.url().split('?')[0].split('/').filter(Boolean)[0] ?? 'dashboard';
    return (seg in this.titles ? seg : 'dashboard') as ScreenKey;
  });

  protected readonly screenTitle = computed(() => this.titles[this.current()]);

  protected readonly themeIcon = computed(() =>
    icon(this.store.theme() === 'light' ? 'moon' : 'sun'),
  );

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.url.set(e.urlAfterRedirects));

    // Candado por impago: si la suscripción está vencida, solo se permite /suscripcion.
    effect(() => {
      if (this.isPastDue() && !this.url().startsWith('/suscripcion')) {
        this.router.navigateByUrl('/suscripcion');
      }
    });
  }

  protected isActive(key: ScreenKey): boolean {
    return this.current() === key;
  }

  protected navIcon(link: NavLink): string {
    return icon(link.iconName, this.isActive(link.key) ? 'var(--primary-text)' : 'currentColor');
  }

  protected navStyle(key: ScreenKey): string {
    const base =
      'display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;border:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:600;width:100%;transition:background .12s;';
    return this.isActive(key)
      ? base + 'background:var(--primary-soft);color:var(--primary-text);'
      : base + 'background:transparent;color:var(--text-2);';
  }

  protected badgeStyle(key: ScreenKey): string {
    const active = this.isActive(key);
    return (
      'font-size:11px;font-weight:700;background:' +
      (active ? 'var(--primary)' : 'var(--surface-hover)') +
      ';color:' +
      (active ? '#fff' : 'var(--text-2)') +
      ';padding:1px 7px;border-radius:20px;'
    );
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComandaStore } from '@core/store';
import { ComandaApi } from '@core/api/comanda-api.service';
import { DashboardDto, OrderStatus } from '@core/api/models';
import { SafeHtmlPipe } from '@shared/safe-html.pipe';
import { icon } from '@shared/icons';
import { badge } from '@shared/ui';
import { money } from '@shared/format';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, SafeHtmlPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  protected readonly store = inject(ComandaStore);
  private readonly api = inject(ComandaApi);

  private readonly data = signal<DashboardDto | null>(null);
  private readonly series = signal<{ label: string; monto: number }[]>([]);

  constructor() {
    // Recarga el dashboard cada vez que cambia el rango (Hoy/Semana/Mes).
    effect(() => {
      const range = this.store.range();
      this.api.dashboard(range).subscribe((d) => this.data.set(d));
    });
    this.api.revenueSeries(7).subscribe((s) => this.series.set(s.map((p) => ({ label: p.label, monto: p.monto }))));
  }

  /** Etiquetas de los días bajo la gráfica de ingresos. */
  protected readonly seriesLabels = computed(() => this.series().map((p) => p.label));

  protected readonly seriesTotal = computed(() => money(this.series().reduce((a, p) => a + p.monto, 0)));

  /** Polilínea SVG (viewBox 0..720 x 0..200) a partir de la serie real. */
  protected readonly revenuePath = computed(() => {
    const pts = this.series();
    if (pts.length < 2) return { line: '', area: '', lastX: 0, lastY: 0, has: false };
    const max = Math.max(1, ...pts.map((p) => p.monto));
    const W = 720, H = 200, top = 20;
    const coords = pts.map((p, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = top + (1 - p.monto / max) * (H - top);
      return [Math.round(x), Math.round(y)] as const;
    });
    const line = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    const [lastX, lastY] = coords[coords.length - 1];
    return { line, area, lastX, lastY, has: true };
  });

  private readonly rangeSub = computed(() => {
    const r = this.store.range();
    return r === 'today' ? 'hoy' : r === 'week' ? 'esta semana' : 'este mes';
  });

  private readonly up = 'font-size:12px;font-weight:700;color:var(--primary-text);background:var(--primary-soft);padding:2px 7px;border-radius:6px;';
  private readonly amberDelta = 'font-size:12px;font-weight:700;color:var(--amber);background:var(--amber-soft);padding:2px 7px;border-radius:6px;';
  private wrap(c: string): string {
    return `width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(${c}-soft);color:var(${c});`;
  }

  private readonly rangeLabel = computed(() => {
    const r = this.store.range();
    return r === 'today' ? 'Ventas de hoy' : r === 'week' ? 'Ventas de la semana' : 'Ventas del mes';
  });

  protected readonly metrics = computed(() => {
    const d = this.data();
    const sub = this.rangeSub();
    return [
      { label: this.rangeLabel(), value: d ? money(d.ventasHoy) : '—', delta: sub, sub: 'pedidos', deltaStyle: this.up, icon: icon('sales', 'var(--primary)'), iconWrap: this.wrap('--primary') },
      { label: 'Pedidos activos', value: d ? String(d.pedidosActivos) : '—', delta: 'en curso', sub: 'en cocina', deltaStyle: this.amberDelta, icon: icon('active', 'var(--amber)'), iconWrap: this.wrap('--amber') },
      { label: 'Ticket promedio', value: d ? money(d.ticketPromedio) : '—', delta: 'media', sub: sub, deltaStyle: this.up, icon: icon('ticket', 'var(--violet)'), iconWrap: this.wrap('--violet') },
      { label: 'Más vendido', value: d && d.topProductos.length ? String(d.topProductos[0].cantidad) : '—', delta: d?.topProductos[0]?.nombre ?? '—', sub: 'uds', deltaStyle: this.up, icon: icon('ticket', 'var(--blue)'), iconWrap: this.wrap('--blue') },
    ];
  });

  protected readonly topProducts = computed(() => {
    const list = this.data()?.topProductos ?? [];
    const max = Math.max(1, ...list.map((p) => p.cantidad));
    const tints = ['var(--amber-soft)', 'var(--red-soft)', 'var(--blue-soft)', 'var(--primary-soft)', 'var(--violet-soft)'];
    return list.map((p, i) => ({
      name: p.nombre, emoji: '🍽️', tint: tints[i % tints.length],
      qty: String(p.cantidad), revenue: money(p.ingresos), pct: Math.round((p.cantidad / max) * 100) + '%',
    }));
  });

  protected readonly lowStock = computed(() =>
    (this.data()?.inventarioBajo ?? []).map((i) => ({
      name: i.nombre, left: `${i.stock} ${i.unit}`, tag: i.estado,
      tagStyle: 'font-size:11px;font-weight:700;border-radius:20px;padding:2px 9px;' +
        (i.estado === 'Crítico'
          ? 'color:var(--red);background:var(--red-soft);'
          : 'color:var(--amber);background:var(--amber-soft);'),
    })),
  );

  private readonly statusLabel: Record<OrderStatus, string> = {
    Nuevos: 'Nuevo', Preparacion: 'En preparación', Listos: 'Listo', Entregados: 'Entregado',
  };
  private readonly statusBadge: Record<OrderStatus, string> = {
    Nuevos: badge('blue'), Preparacion: badge('amber'), Listos: badge('primary'), Entregados: badge('violet'),
  };

  protected readonly activeOrders = computed(() =>
    (this.data()?.pedidosActivosLista ?? []).slice(0, 5).map((o) => ({
      id: o.code, table: o.table, status: this.statusLabel[o.status],
      total: money(o.total), statusStyle: this.statusBadge[o.status],
    })),
  );

  protected readonly rangeTabs = computed(() => {
    const items: [('today' | 'week' | 'month'), string][] = [['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes']];
    const base = 'border:none;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;padding:6px 14px;border-radius:8px;';
    return items.map(([v, l]) => ({
      label: l, value: v,
      style: this.store.range() === v
        ? base + 'background:var(--surface-hover);color:var(--text);box-shadow:var(--shadow-sm);'
        : base + 'background:transparent;color:var(--text-3);',
    }));
  });

  protected setRange(v: 'today' | 'week' | 'month'): void {
    this.store.range.set(v);
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { ComandaStore } from '@core/store';
import { ComandaApi } from '@core/api/comanda-api.service';
import { BranchPerfDto, RevenuePointDto, SalesReportDto } from '@core/api/models';
import { money } from '@shared/format';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  protected readonly store = inject(ComandaStore);
  private readonly api = inject(ComandaApi);

  private readonly data = signal<SalesReportDto | null>(null);
  private readonly series = signal<RevenuePointDto[]>([]);
  private readonly branchPerf = signal<BranchPerfDto[]>([]);

  constructor() {
    // Ventas reaccionan al rango; serie y sucursales se cargan una vez.
    effect(() => {
      const range = this.store.range();
      this.api.salesReport(range).subscribe((d) => this.data.set(d));
    });
    this.api.revenueSeries(14).subscribe((s) => this.series.set(s));
    this.api.branchPerformance().subscribe((b) => this.branchPerf.set(b));
  }

  protected readonly totalVentasLabel = computed(() => {
    const d = this.data();
    return d ? money(d.totalVentas) : '—';
  });

  protected readonly rangeSubtitle = computed(() => {
    const r = this.store.range();
    return r === 'today' ? 'Ventas de hoy' : r === 'week' ? 'Últimos 7 días' : 'Últimos 30 días';
  });

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

  /** Barras de ingresos por día (serie real de 14 días). */
  protected readonly barData = computed(() => {
    const pts = this.series();
    const max = Math.max(1, ...pts.map((p) => p.monto));
    const peak = pts.reduce((m, p, i) => (p.monto > pts[m].monto ? i : m), 0);
    return pts.map((p, i) => ({
      day: p.label, monto: p.monto,
      barStyle:
        'width:100%;border-radius:5px 5px 2px 2px;background:' +
        (i === peak ? 'var(--primary)' : 'color-mix(in srgb,var(--primary) 38%,transparent)') +
        ';height:' + Math.max(2, Math.round((p.monto / max) * 100)) + '%;transition:height .2s;',
    }));
  });

  protected readonly seriesTotalLabel = computed(() => money(this.series().reduce((a, p) => a + p.monto, 0)));

  private readonly catColors = ['var(--primary)', 'var(--blue)', 'var(--violet)', 'var(--amber)', 'var(--red)'];

  protected readonly catSplit = computed(() =>
    (this.data()?.ventasPorCategoria ?? []).map((c, i) => ({
      cat: c.categoria, pct: c.porcentaje + '%', amount: money(c.monto),
      color: this.catColors[i % this.catColors.length],
    })),
  );

  /** Rendimiento por sucursal (datos reales). */
  protected readonly branches = computed(() => {
    const list = this.branchPerf();
    const maxVentas = Math.max(1, ...list.map((b) => b.ventas));
    return list.map((b) => {
      const pct = Math.round((b.ventas / maxVentas) * 100);
      return {
        name: b.nombre, orders: String(b.pedidos), ticket: money(b.ticket), sales: money(b.ventas),
        pct: pct + '%',
        barStyle: 'height:100%;width:' + pct + '%;background:' + (pct >= 80 ? 'var(--primary)' : 'var(--amber)') + ';border-radius:20px;',
      };
    });
  });

  protected readonly reportTop = computed(() => {
    const list = this.data()?.topProductos ?? [];
    const totalIng = list.reduce((a, p) => a + p.ingresos, 0);
    return list.map((p, i) => ({
      rank: String(i + 1), name: p.nombre, qty: String(p.cantidad), revenue: money(p.ingresos),
      share: totalIng ? Math.round((p.ingresos / totalIng) * 100) + '%' : '0%',
    }));
  });

  protected setRange(v: 'today' | 'week' | 'month'): void {
    this.store.range.set(v);
  }

  // ---- Exportar ----

  /** Descarga un CSV (abre en Excel) con el top de productos y ventas por categoría. */
  protected exportExcel(): void {
    const d = this.data();
    if (!d) return;
    const rows: string[][] = [
      ['Reporte de ventas', this.rangeSubtitle()],
      [],
      ['Producto', 'Unidades', 'Ingresos'],
      ...d.topProductos.map((p) => [p.nombre, String(p.cantidad), p.ingresos.toFixed(2)]),
      [],
      ['Categoría', 'Monto', 'Participación'],
      ...d.ventasPorCategoria.map((c) => [c.categoria, c.monto.toFixed(2), c.porcentaje + '%']),
      [],
      ['Total ventas', d.totalVentas.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    // BOM para que Excel respete los acentos.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, `comanda-reporte-${this.store.range()}.csv`);
  }

  /** Genera el PDF usando el diálogo de impresión del navegador. */
  protected exportPdf(): void {
    window.print();
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

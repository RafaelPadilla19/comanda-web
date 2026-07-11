import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComandaStore } from '@core/store';
import { ModalComponent } from '@shared/modal.component';
import { MovementType } from '@core/api/models';
import { money, moneySigned } from '@shared/format';

@Component({
  selector: 'app-caja',
  imports: [ModalComponent, FormsModule],
  templateUrl: './caja.component.html',
})
export class CajaComponent implements OnInit {
  protected readonly store = inject(ComandaStore);

  ngOnInit(): void {
    this.store.loadCaja();
  }

  // ---- Modal de movimiento ----
  protected readonly mvType = signal<MovementType | null>(null);
  protected readonly mvLabel = signal('');
  protected readonly mvAmount = signal<number | null>(null);

  protected openMovement(type: MovementType): void {
    this.mvType.set(type);
    this.mvLabel.set(type === 'Ingreso' ? 'Ingreso de efectivo' : 'Egreso de efectivo');
    this.mvAmount.set(null);
  }

  protected closeMovement(): void {
    this.mvType.set(null);
  }

  protected submitMovement(): void {
    const type = this.mvType();
    const amount = this.mvAmount();
    if (!type || !amount || amount <= 0 || !this.mvLabel().trim()) return;
    this.store.registerMovement(this.mvLabel().trim(), 'Registro manual', amount, type);
    this.closeMovement();
  }

  protected readonly bannerStyle = computed(() => {
    const open = this.store.caja().open;
    return (
      'display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:var(--r);border:1px solid ' +
      (open ? 'var(--primary)' : 'var(--border)') + ';background:' +
      (open ? 'var(--primary-soft)' : 'var(--surface-2)') + ';margin-bottom:18px;'
    );
  });

  protected readonly statusBig = computed(() => (this.store.caja().open ? 'Caja abierta' : 'Caja cerrada'));
  protected readonly statusColor = computed(() => (this.store.caja().open ? 'var(--primary-text)' : 'var(--text-2)'));
  protected readonly closeLabel = computed(() => (this.store.caja().open ? 'Cerrar caja y hacer arqueo' : 'Abrir caja'));

  protected readonly kpis = computed(() => {
    const c = this.store.caja();
    const mvNet = c.movements.reduce((a, m) => a + m.amount, 0);
    const esperado = c.salesEfectivo + mvNet;
    const digital = c.salesTarjeta + c.salesTransfer365 + c.salesTransfer;
    return [
      { label: 'Efectivo esperado en caja', value: money(esperado), sub: 'Fondo + ventas − retiros' },
      { label: 'Ventas en efectivo', value: money(c.salesEfectivo), sub: 'Hoy' },
      { label: 'Ventas digitales', value: money(digital), sub: 'Tarjeta · Transfer365 · Transf.' },
      { label: 'Movimientos de caja', value: moneySigned(mvNet), sub: c.movements.length + ' registros' },
    ];
  });

  protected readonly totalVentas = computed(() => {
    const c = this.store.caja();
    return money(c.salesEfectivo + c.salesTarjeta + c.salesTransfer365 + c.salesTransfer);
  });

  protected readonly payRows = computed(() => {
    const c = this.store.caja();
    const total = c.salesEfectivo + c.salesTarjeta + c.salesTransfer365 + c.salesTransfer;
    return [
      { label: 'Efectivo', emoji: '💵', amount: c.salesEfectivo },
      { label: 'Tarjeta', emoji: '💳', amount: c.salesTarjeta },
      { label: 'Transfer365', emoji: '📱', amount: c.salesTransfer365 },
      { label: 'Transferencia', emoji: '🏦', amount: c.salesTransfer },
    ].map((r) => ({ ...r, amountLabel: money(r.amount), pct: Math.round((r.amount / total) * 100) + '%' }));
  });

  protected readonly movements = computed(() =>
    this.store.caja().movements.map((m) => ({
      ...m,
      amountLabel: moneySigned(m.amount),
      amountColor: m.amount >= 0 ? 'var(--primary-text)' : 'var(--red)',
      iconBg: m.type === 'fondo' ? 'var(--violet-soft)' : m.amount >= 0 ? 'var(--primary-soft)' : 'var(--red-soft)',
      iconColor: m.type === 'fondo' ? 'var(--violet)' : m.amount >= 0 ? 'var(--primary)' : 'var(--red)',
      sign: m.amount >= 0 ? '↓' : '↑',
    })),
  );
}

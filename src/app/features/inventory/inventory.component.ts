import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComandaStore } from '@core/store';
import { ModalComponent } from '@shared/modal.component';
import { money, moneyShort } from '@shared/format';
import { badge, invStatus } from '@shared/ui';

@Component({
  selector: 'app-inventory',
  imports: [ModalComponent, FormsModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent implements OnInit {
  protected readonly store = inject(ComandaStore);

  ngOnInit(): void {
    this.store.loadInventory();
  }

  // ---- Modal: nuevo insumo ----
  protected readonly newOpen = signal(false);
  protected readonly nName = signal('');
  protected readonly nCategory = signal('');
  protected readonly nUnit = signal('kg');
  protected readonly nStock = signal<number | null>(null);
  protected readonly nMin = signal<number | null>(null);
  protected readonly nCost = signal<number | null>(null);

  protected openNew(): void {
    this.nName.set(''); this.nCategory.set(''); this.nUnit.set('kg');
    this.nStock.set(null); this.nMin.set(null); this.nCost.set(null);
    this.newOpen.set(true);
  }

  protected submitNew(): void {
    if (!this.nName().trim() || !this.nUnit().trim()) return;
    this.store.createInventoryItem({
      name: this.nName().trim(), category: this.nCategory().trim(), unit: this.nUnit().trim(),
      stock: this.nStock() ?? 0, min: this.nMin() ?? 0, cost: this.nCost() ?? 0,
    });
    this.newOpen.set(false);
  }

  // ---- Modal: registrar movimiento ----
  protected readonly mvOpen = signal(false);
  protected readonly mvItemId = signal('');
  protected readonly mvKind = signal<'Entrada' | 'Salida'>('Entrada');
  protected readonly mvQty = signal<number | null>(null);

  protected openMovement(): void {
    this.mvItemId.set(this.store.inventory()[0]?.id ?? '');
    this.mvKind.set('Entrada');
    this.mvQty.set(null);
    this.mvOpen.set(true);
  }

  protected submitMovement(): void {
    const qty = this.mvQty();
    if (!this.mvItemId() || !qty || qty <= 0) return;
    this.store.adjustStock(this.mvItemId(), this.mvKind() === 'Entrada' ? qty : -qty);
    this.mvOpen.set(false);
  }

  protected readonly items = computed(() =>
    this.store.inventory().map((i) => {
      const st = invStatus(i);
      return {
        ...i,
        stockLabel: i.stock + ' ' + i.unit,
        minLabel: i.min + ' ' + i.unit,
        costLabel: money(i.cost),
        valueLabel: money(i.stock * i.cost),
        statusLabel: st.label,
        statusStyle: badge(st.c),
        barPct: Math.min(100, Math.round((i.stock / (i.min * 2)) * 100)) + '%',
        barColor: `var(--${st.c})`,
      };
    }),
  );

  protected readonly totalItems = computed(() => this.store.inventory().length);
  protected readonly totalValue = computed(() =>
    moneyShort(this.store.inventory().reduce((a, i) => a + i.stock * i.cost, 0)),
  );
  protected readonly alerts = computed(() =>
    this.store.inventory().filter((i) => invStatus(i).key !== 'ok').length,
  );
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComandaApi } from '@core/api/comanda-api.service';
import { CustomerDetailDto, CustomerDto } from '@core/api/models';
import { money } from '@shared/format';

@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  templateUrl: './customers.component.html',
})
export class CustomersComponent implements OnInit {
  private readonly api = inject(ComandaApi);
  protected readonly money = money;

  protected readonly customers = signal<CustomerDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly query = signal('');

  ngOnInit(): void {
    this.api.listCustomers().subscribe({
      next: (c) => { this.customers.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** Filtro local por nombre o teléfono. */
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.customers();
    const digits = q.replace(/\D/g, '');
    return this.customers().filter((c) =>
      c.name.toLowerCase().includes(q) || (digits.length > 0 && c.phone.includes(digits)),
    );
  });

  protected readonly summary = computed(() => {
    const list = this.customers();
    const total = list.length;
    const revenue = list.reduce((s, c) => s + c.totalSpent, 0);
    return { total, revenue: money(revenue) };
  });

  protected initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  }

  protected fmtDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Etiqueta de lealtad según número de pedidos. */
  protected tier(count: number): { label: string; color: string } {
    if (count >= 10) return { label: 'VIP', color: 'violet' };
    if (count >= 5) return { label: 'Frecuente', color: 'primary' };
    if (count >= 2) return { label: 'Recurrente', color: 'blue' };
    return { label: 'Nuevo', color: 'amber' };
  }

  // ---- Detalle ----
  protected readonly detail = signal<CustomerDetailDto | null>(null);
  protected readonly detailLoading = signal(false);

  protected open(c: CustomerDto): void {
    this.detailLoading.set(true);
    this.detail.set(null);
    this.api.getCustomer(c.id).subscribe({
      next: (d) => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => this.detailLoading.set(false),
    });
  }

  protected close(): void { this.detail.set(null); }

  protected itemsLabel(items: { quantity: number; productName: string }[]): string {
    return items.map((i) => `${i.quantity}× ${i.productName}`).join(', ');
  }
}

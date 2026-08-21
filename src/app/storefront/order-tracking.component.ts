import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StorefrontApi } from './storefront-api.service';
import { OrderDto, OrderStatus } from '@core/api/models';
import { money } from '@shared/format';
import { RiderTrackerComponent } from './rider-tracker.component';

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'Nuevos', label: 'Recibido', emoji: '🧾' },
  { status: 'Preparacion', label: 'En preparación', emoji: '👨‍🍳' },
  { status: 'Listos', label: 'Listo', emoji: '✅' },
  { status: 'Entregados', label: 'Entregado', emoji: '🎉' },
];

/** Link de seguimiento persistente del pedido (compartible, se puede reabrir cuando sea) — a
 * diferencia de la pantalla de confirmación, que solo aparece una vez al hacer el pedido. */
@Component({
  selector: 'app-order-tracking',
  imports: [RiderTrackerComponent],
  template: `
    <div class="ot-wrap">
      @if (loading()) {
        <p class="ot-msg">Buscando tu pedido…</p>
      } @else if (!order()) {
        <p class="ot-msg">No encontramos ese pedido.</p>
      } @else {
        <header class="ot-hd">
          <div class="ot-badge">📦</div>
          <h1>Pedido {{ order()!.code }}</h1>
          <p>{{ money(order()!.total) }}</p>
        </header>

        <div class="ot-steps">
          @for (s of steps(); track s.status) {
            <div class="ot-step" [class.done]="s.done" [class.current]="s.current">
              <span class="ot-step-icon">{{ s.emoji }}</span>
              <span class="ot-step-label">{{ s.label }}</span>
            </div>
          }
        </div>

        @if (order()!.channel === 'Delivery') {
          <app-rider-tracker [orderId]="order()!.id" [customerLat]="order()!.customerLat" [customerLng]="order()!.customerLng" />
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg); color: var(--text); }
    .ot-wrap { max-width: 460px; margin: 0 auto; padding: 32px 18px; }
    .ot-msg { text-align: center; color: var(--text-3); padding: 60px 0; }
    .ot-hd { text-align: center; margin-bottom: 24px; }
    .ot-badge {
      width: 60px; height: 60px; margin: 0 auto 14px;
      display: grid; place-items: center; font-size: 30px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
    }
    .ot-hd h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.4px; }
    .ot-hd p { font-size: 14px; color: var(--text-2); margin-top: 4px; }
    .ot-steps { display: flex; justify-content: space-between; gap: 4px; }
    .ot-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: .35; }
    .ot-step.done, .ot-step.current { opacity: 1; }
    .ot-step-icon {
      width: 42px; height: 42px; display: grid; place-items: center; font-size: 20px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 50%;
    }
    .ot-step.current .ot-step-icon { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
    .ot-step-label { font-size: 10.5px; font-weight: 600; color: var(--text-2); text-align: center; }
  `],
})
export class OrderTrackingComponent implements OnInit {
  private readonly api = inject(StorefrontApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly money = money;

  protected readonly loading = signal(true);
  protected readonly order = signal<OrderDto | null>(null);

  protected readonly steps = computed(() => {
    const o = this.order();
    if (!o) return [];
    const currentIdx = STEPS.findIndex((s) => s.status === o.status);
    return STEPS.map((s, i) => ({ ...s, done: i < currentIdx, current: i === currentIdx }));
  });

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
    if (!orderId) { this.loading.set(false); return; }
    this.load(orderId);
    // El estado avanza mientras el restaurante prepara el pedido; se refresca cada 15s.
    setInterval(() => this.load(orderId), 15_000);
  }

  private load(orderId: string): void {
    this.api.orderTracking(orderId).subscribe({
      next: (o) => { this.order.set(o); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}

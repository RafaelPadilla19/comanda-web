import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComandaStore } from '@core/store';
import { KitchenOrder, OrderColumn } from '@shared/models';

interface ColumnDef {
  key: OrderColumn;
  title: string;
  accent: string;
  fwd: string | null;
}

@Component({
  selector: 'app-orders',
  imports: [RouterLink, FormsModule],
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit {
  protected readonly store = inject(ComandaStore);

  ngOnInit(): void {
    this.store.loadOrders();
    this.store.loadDrivers();
  }

  /** Asigna repartidor a un pedido de delivery (lo marca "en camino"). */
  protected assign(orderId: string, driverId: string): void {
    if (driverId) this.store.assignDriver(orderId, driverId);
  }

  /** Publica el pedido al pool de riders independientes cuando no hay repartidor propio disponible. */
  protected requestExternalRider(orderId: string): void {
    this.store.requestExternalRider(orderId);
  }

  private readonly defs: ColumnDef[] = [
    { key: 'nuevos', title: 'Nuevos', accent: 'blue', fwd: 'Preparar' },
    { key: 'preparacion', title: 'En preparación', accent: 'amber', fwd: 'Marcar listo' },
    { key: 'listos', title: 'Listos', accent: 'primary', fwd: 'Entregar' },
    { key: 'entregados', title: 'Entregados', accent: 'violet', fwd: null },
  ];

  private initials(w: string): string {
    return w === 'App' ? '📱' : w.slice(0, 2).toUpperCase();
  }

  protected readonly columns = computed(() => {
    const orders = this.store.orders();
    return this.defs.map((d, ci) => ({
      key: d.key, title: d.title, accent: d.accent, dot: `var(--${d.accent})`,
      countStyle: `font-size:12px;font-weight:700;color:var(--${d.accent});background:var(--${d.accent}-soft);min-width:22px;text-align:center;padding:1px 7px;border-radius:20px;`,
      count: orders[d.key].length,
      orders: orders[d.key].map((o) => ({
        ...o, whoInit: this.initials(o.who),
        tableStyle: `font-size:11.5px;font-weight:700;color:var(--${d.accent});background:var(--${d.accent}-soft);padding:2px 9px;border-radius:7px;`,
        canBack: ci > 0, canFwd: !!d.fwd, fwdLabel: d.fwd,
        fwdStyle: `flex:1;height:34px;border:none;border-radius:8px;background:var(--${d.accent});color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;`,
      })),
    }));
  });

  protected forward(id: string, key: OrderColumn): void {
    this.store.moveOrder(id, key, 1);
  }

  protected back(id: string, key: OrderColumn): void {
    this.store.moveOrder(id, key, -1);
  }

  // ---- Notificar por WhatsApp (fase 1: click-to-chat, sin API) ----

  /** Normaliza a formato wa.me: solo dígitos; 8 dígitos = número local SV → antepone 503. */
  private waPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return digits.length === 8 ? '503' + digits : digits;
  }

  /** Mensaje según la etapa del pedido (el negocio solo toca "enviar" en WhatsApp). */
  private waMessage(o: KitchenOrder, col: OrderColumn): string {
    const hola = o.customer ? `¡Hola ${o.customer}!` : '¡Hola!';
    switch (col) {
      case 'nuevos':
        return `${hola} 👋 Recibimos tu pedido ${o.code}. En un momento lo empezamos a preparar.`;
      case 'preparacion':
        return `${hola} Tu pedido ${o.code} ya está en preparación 👨‍🍳`;
      case 'listos':
        if (o.isDelivery && o.dispatched && o.driver)
          return `${hola} Tu pedido ${o.code} va en camino 🛵 Te lo lleva ${o.driver}.`;
        if (o.isDelivery)
          return `${hola} Tu pedido ${o.code} está listo 🎉 En breve sale hacia tu dirección.`;
        return `${hola} Tu pedido ${o.code} está listo 🎉 Ya puedes pasar a recogerlo.`;
      default:
        return `${hola} Tu pedido ${o.code} fue entregado ✅ ¡Gracias por tu preferencia! 🙏`;
    }
  }

  /** Abre WhatsApp con el mensaje prellenado para el cliente del pedido. */
  protected notifyWa(o: KitchenOrder, col: OrderColumn): void {
    const phone = this.waPhone(o.phone);
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(this.waMessage(o, col))}`, '_blank');
  }
}

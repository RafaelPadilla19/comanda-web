import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ComandaStore } from '@core/store';
import { ModalComponent } from '@shared/modal.component';
import { ProductDto, ProductOptionDto } from '@core/api/models';
import { money, IVA_RATE } from '@shared/format';

@Component({
  selector: 'app-pos',
  imports: [ModalComponent],
  templateUrl: './pos.component.html',
})
export class PosComponent implements OnInit {
  protected readonly store = inject(ComandaStore);
  protected readonly ivaPct = Math.round(IVA_RATE * 100);
  protected readonly money = money;

  ngOnInit(): void {
    this.store.loadCatalog();
  }

  // ---- Modificadores en el POS ----
  protected readonly modProduct = signal<ProductDto | null>(null);
  protected readonly modVariant = signal<ProductOptionDto | null>(null);
  protected readonly modExtras = signal<ProductOptionDto[]>([]);

  /** Agrega directo si no hay opciones; abre el selector si las hay. */
  protected onAdd(id: string): void {
    const p = this.store.products().find((x) => x.id === id);
    if (!p) return;
    if (p.variants.length || p.extras.length) {
      this.modProduct.set(p);
      this.modVariant.set(p.variants.length ? p.variants[0] : null);
      this.modExtras.set([]);
    } else {
      this.store.addToCart(p);
    }
  }

  protected closeMods(): void { this.modProduct.set(null); }

  protected toggleExtra(ex: ProductOptionDto): void {
    this.modExtras.update((list) => (list.some((e) => e.name === ex.name) ? list.filter((e) => e.name !== ex.name) : [...list, ex]));
  }
  protected isExtraOn(ex: ProductOptionDto): boolean {
    return this.modExtras().some((e) => e.name === ex.name);
  }

  protected readonly modUnitPrice = computed(() => {
    const p = this.modProduct();
    if (!p) return 0;
    return p.price + (this.modVariant()?.price ?? 0) + this.modExtras().reduce((s, e) => s + e.price, 0);
  });

  protected confirmMods(): void {
    const p = this.modProduct();
    if (!p) return;
    this.store.addToCart(p, this.modVariant(), this.modExtras());
    this.modProduct.set(null);
  }

  protected optLabel(o: ProductOptionDto): string {
    return o.price > 0 ? `${o.name}  +${money(o.price)}` : o.name;
  }

  protected readonly posCats = computed(() => {
    const products = this.store.products();
    const cats = this.store.categories().slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const base = 'border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;padding:8px 16px;border-radius:10px;white-space:nowrap;display:flex;align-items:center;gap:7px;';
    return cats.map((c) => {
      const active = this.store.posCat() === c.name;
      return {
        label: c.name, value: c.name, count: products.filter((p) => p.categoryName === c.name).length,
        style: active
          ? base + 'background:var(--primary);color:#fff;box-shadow:0 4px 12px rgba(16,185,129,.3);'
          : base + 'background:var(--surface);color:var(--text-2);border:1px solid var(--border);',
        countStyle:
          'font-size:11px;font-weight:700;padding:0 6px;border-radius:20px;background:' +
          (active ? 'rgba(255,255,255,.22)' : 'var(--surface-hover)') +
          ';color:' + (active ? '#fff' : 'var(--text-3)') + ';',
      };
    });
  });

  protected readonly posProducts = computed(() => {
    const cat = this.store.posCat();
    return this.store.products()
      .filter((p) => p.categoryName === cat && p.isAvailable)
      .map((p) => {
        const inCart = this.store.qtyInCart(p.id);
        return {
          id: p.id, name: p.name, price: p.price, emoji: p.emoji, tint: p.tint,
          priceLabel: money(p.price), inCart, hasQty: inCart > 0, qtyLabel: String(inCart),
          cardStyle:
            'background:var(--surface);border:1px solid ' + (inCart ? 'var(--primary)' : 'var(--border)') +
            ';border-radius:var(--r);padding:10px;cursor:pointer;text-align:left;font-family:inherit;color:var(--text);position:relative;box-shadow:' +
            (inCart ? '0 0 0 3px var(--primary-soft)' : 'var(--shadow-sm)') + ';transition:border-color .1s;',
        };
      });
  });

  /** Botones segmentados del tipo de pedido (mesa / para llevar / delivery). */
  protected readonly channels = computed(() => {
    const cur = this.store.orderChannel();
    const base =
      'display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 6px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:var(--text);transition:border-color .1s;border:1.5px solid ';
    return ([
      { id: 'mesa', label: 'Mesa', emoji: '🪑' },
      { id: 'llevar', label: 'Para llevar', emoji: '🥡' },
      { id: 'delivery', label: 'Delivery', emoji: '🛵' },
    ] as const).map((c) => ({
      ...c,
      style: base + (cur === c.id ? 'var(--primary);background:var(--primary-soft);' : 'var(--border);background:var(--surface-2);'),
    }));
  });

  protected checkout(): void {
    this.store.createOrderFromCart();
  }

  protected readonly cartItems = computed(() =>
    this.store.cart().map((c) => ({
      ...c, lineTotal: money(c.price * c.qty), priceEach: money(c.price),
    })),
  );

  protected readonly discountChips = computed(() => {
    const cur = this.store.discount();
    return [0, 10, 15].map((d) => ({
      label: d === 0 ? 'Sin desc.' : d + '%', value: d,
      style:
        'border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;' +
        (cur === d
          ? 'background:var(--primary-soft);color:var(--primary-text);box-shadow:inset 0 0 0 1px var(--primary);'
          : 'background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);'),
    }));
  });

  protected readonly payMethods = computed(() => {
    const cur = this.store.payment();
    return [
      { id: 'efectivo', label: 'Efectivo', emoji: '💵' },
      { id: 'tarjeta', label: 'Tarjeta', emoji: '💳' },
      { id: 'transfer365', label: 'Transfer365', emoji: '📱' },
      { id: 'transfer', label: 'Transferencia', emoji: '🏦' },
    ].map((m) => ({
      ...m,
      style:
        'display:flex;align-items:center;gap:8px;border:1.5px solid ' +
        (cur === m.id ? 'var(--primary)' : 'var(--border)') + ';background:' +
        (cur === m.id ? 'var(--primary-soft)' : 'var(--surface-2)') +
        ';border-radius:10px;padding:10px 12px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--text);',
    }));
  });

  protected readonly subtotalLabel = computed(() => money(this.store.subtotal()));
  protected readonly discountLabel = computed(() => '− ' + money(this.store.discountAmount()));
  protected readonly discountPctLabel = computed(() => this.store.discount() + '% desc.');
  protected readonly totalLabel = computed(() => money(this.store.total()));
  protected readonly chargeLabel = computed(() =>
    this.store.cart().length ? 'Cobrar ' + money(this.store.total()) : 'Carrito vacío',
  );
}

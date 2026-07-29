import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StorefrontApi } from './storefront-api.service';
import { DeliveryZoneDto, LoyaltyLookupDto, OrderChannel, OrderDto, ProductOptionDto, PublicMenuDto, PublicProductDto } from '@core/api/models';
import { IVA_RATE, money } from '@shared/format';
import { LocationPickerComponent } from '@shared/location-picker.component';

/** Distancia en línea recta entre dos coordenadas (fórmula de Haversine), en km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

interface CartLine {
  key: string;          // producto + modificadores → identifica la línea
  product: PublicProductDto;
  qty: number;
  unitPrice: number;    // precio base + variante + extras
  variant: string | null;
  extras: string[];
  label: string;        // resumen de modificadores: "Maíz · +Queso extra"
}

interface ChannelOpt {
  value: OrderChannel;
  label: string;
  emoji: string;
}

@Component({
  selector: 'app-storefront',
  imports: [FormsModule, LocationPickerComponent],
  templateUrl: './storefront.component.html',
  styleUrl: './storefront.component.css',
})
export class StorefrontComponent implements OnInit {
  private readonly api = inject(StorefrontApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly money = money;

  protected readonly menu = signal<PublicMenuDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private branchId = '';

  // ---- Canal / categoría ----
  protected readonly channels: ChannelOpt[] = [
    { value: 'Local', label: 'En el local', emoji: '🍽️' },
    { value: 'Llevar', label: 'Para llevar', emoji: '🥡' },
    { value: 'Delivery', label: 'A domicilio', emoji: '🛵' },
  ];
  protected readonly channel = signal<OrderChannel>('Local');
  protected readonly activeCat = signal<string>('all');
  protected readonly search = signal('');

  protected setChannel(c: OrderChannel): void {
    this.channel.set(c);
    // Auto-selecciona la primera zona al cambiar a delivery.
    if (c === 'Delivery' && !this.zoneId() && this.zones().length) this.zoneId.set(this.zones()[0].id);
  }
  protected setCat(id: string): void { this.activeCat.set(id); }

  // ---- Zonas de entrega (por nombre) ----
  protected readonly zones = computed<DeliveryZoneDto[]>(() => this.menu()?.deliveryZones ?? []);
  protected readonly zoneId = signal<string>('');
  protected setZone(id: string): void { this.zoneId.set(id); }
  private readonly selectedZone = computed(() => this.zones().find((z) => z.id === this.zoneId()) ?? null);

  // ---- Cobertura por radio (distancia real desde la sucursal) ----
  protected readonly usesCoverageRadius = computed(() => !!this.menu()?.coverageRadiusKm);
  protected readonly customerLat = signal<number | null>(null);
  protected readonly customerLng = signal<number | null>(null);
  protected onCustomerLocation(loc: { lat: number; lng: number }): void {
    this.customerLat.set(loc.lat); this.customerLng.set(loc.lng);
  }
  protected readonly distanceKm = computed(() => {
    const m = this.menu();
    const lat = this.customerLat(), lng = this.customerLng();
    if (!m?.branchLat || !m?.branchLng || lat == null || lng == null) return null;
    return haversineKm(m.branchLat, m.branchLng, lat, lng);
  });
  protected readonly outOfCoverage = computed(() => {
    const d = this.distanceKm(), radius = this.menu()?.coverageRadiusKm;
    return d != null && radius != null && d > radius;
  });

  /** Secciones visibles. Si hay búsqueda, una sola sección con las coincidencias. */
  protected readonly sections = computed(() => {
    const m = this.menu();
    if (!m) return [];

    const q = this.search().trim().toLowerCase();
    if (q) {
      const hits = m.products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
      return hits.length ? [{ id: 'search', name: `Resultados (${hits.length})`, products: hits }] : [];
    }

    const cat = this.activeCat();
    return m.categories
      .filter((c) => cat === 'all' || c.id === cat)
      .map((c) => ({ id: c.id, name: c.name, products: m.products.filter((p) => p.categoryId === c.id) }))
      .filter((s) => s.products.length > 0);
  });

  // ---- Carrito ----
  protected readonly cart = signal<CartLine[]>([]);

  protected readonly cartCount = computed(() => this.cart().reduce((n, l) => n + l.qty, 0));
  protected readonly subtotal = computed(() => this.cart().reduce((s, l) => s + l.unitPrice * l.qty, 0));
  protected readonly deliveryFee = computed(() => {
    if (this.channel() !== 'Delivery') return 0;
    const m = this.menu();
    if (this.usesCoverageRadius() && m) {
      const d = this.distanceKm();
      if (d == null || this.outOfCoverage()) return 0;
      return Math.round((m.deliveryBaseFee + m.deliveryFeePerKm * d) * 100) / 100;
    }
    return this.selectedZone()?.fee ?? 0;
  });
  protected readonly pointsDiscount = computed(() => {
    if (!this.redeemPoints()) return 0;
    const l = this.loyalty();
    return l?.enabled ? l.redeemableAmount : 0;
  });
  protected readonly discount = computed(() =>
    Math.min(this.appliedDiscount() + this.pointsDiscount(), this.subtotal()),
  );
  protected readonly total = computed(() =>
    Math.max(0, this.subtotal() + this.deliveryFee() - this.discount() + this.tipRestaurant() + this.tipRider()),
  );

  // ---- Propinas (opcionales) ----
  protected readonly tipRestaurantPct = signal<number | null>(null); // null = "sin propina" seleccionado
  protected readonly tipRestaurantCustom = signal<number | null>(null);
  protected readonly tipRestaurant = computed(() => {
    if (this.tipRestaurantCustom() != null) return this.tipRestaurantCustom()!;
    if (!this.tipRestaurantPct()) return 0;
    return Math.round(this.subtotal() * (this.tipRestaurantPct()! / 100) * 100) / 100;
  });
  protected readonly tipRider = signal<number>(0);

  protected setTipRestaurantPct(pct: number): void {
    this.tipRestaurantPct.set(pct); this.tipRestaurantCustom.set(null);
  }
  protected setTipRestaurantCustom(v: string): void {
    const n = Number(v);
    this.tipRestaurantCustom.set(n > 0 ? n : null);
    this.tipRestaurantPct.set(null);
  }
  protected setTipRider(amount: number): void {
    this.tipRider.set(this.tipRider() === amount ? 0 : amount);
  }

  // ---- Método de pago ----
  protected readonly payOnline = signal(false);

  // ---- Fidelización (puntos) ----
  protected readonly loyalty = signal<LoyaltyLookupDto | null>(null);
  protected readonly redeemPoints = signal(false);

  /** Consulta los puntos del cliente al escribir su teléfono (8+ dígitos). */
  protected onPhoneChange(v: string): void {
    this.cPhone.set(v);
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 8) {
      this.api.loyaltyLookup(this.branchId, digits).subscribe((l) => this.loyalty.set(l.enabled ? l : null));
    } else {
      this.loyalty.set(null); this.redeemPoints.set(false);
    }
  }

  // ---- Cupón ----
  protected readonly couponInput = signal('');
  protected readonly appliedCode = signal('');
  protected readonly appliedDiscount = signal(0);
  protected readonly couponMsg = signal<string | null>(null);
  protected readonly couponOk = signal(false);

  protected applyCoupon(): void {
    const code = this.couponInput().trim();
    if (!code) return;
    this.api.validateCoupon(this.branchId, code, this.subtotal()).subscribe((r) => {
      this.couponOk.set(r.valid);
      this.couponMsg.set(r.message);
      if (r.valid) { this.appliedCode.set(r.code); this.appliedDiscount.set(r.discount); }
      else { this.appliedCode.set(''); this.appliedDiscount.set(0); }
    });
  }

  protected removeCoupon(): void {
    this.couponInput.set(''); this.appliedCode.set(''); this.appliedDiscount.set(0);
    this.couponMsg.set(null); this.couponOk.set(false);
  }
  protected readonly ivaIncluded = computed(() => {
    const sub = this.subtotal();
    return sub - sub / (1 + IVA_RATE);
  });

  /** ¿El producto tiene modificadores que elegir? */
  protected hasMods(p: PublicProductDto): boolean {
    return (p.variants?.length ?? 0) > 0 || (p.extras?.length ?? 0) > 0;
  }

  private lineKey(id: string, variant: string | null, extras: string[]): string {
    return `${id}|${variant ?? ''}|${[...extras].sort().join(',')}`;
  }

  /** Cantidad de un producto SIN modificadores (para el stepper en la tarjeta). */
  protected qtyOf(id: string): number {
    return this.cart().find((l) => l.key === this.lineKey(id, null, []))?.qty ?? 0;
  }

  /** Botón "Agregar" de la tarjeta: abre el selector si hay modificadores, o agrega directo. */
  protected onAdd(p: PublicProductDto): void {
    if (this.hasMods(p)) this.openMods(p);
    else this.addLine(p, null, []);
  }

  private addLine(p: PublicProductDto, variant: ProductOptionDto | null, extras: ProductOptionDto[]): void {
    const variantName = variant?.name ?? null;
    const extraNames = extras.map((e) => e.name);
    const key = this.lineKey(p.id, variantName, extraNames);
    const unitPrice = p.price + (variant?.price ?? 0) + extras.reduce((s, e) => s + e.price, 0);
    const label = [variant?.name, ...extras.map((e) => '+' + e.name)].filter(Boolean).join(' · ');
    this.cart.update((lines) => {
      const found = lines.find((l) => l.key === key);
      if (found) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...lines, { key, product: p, qty: 1, unitPrice, variant: variantName, extras: extraNames, label }];
    });
  }

  protected add(p: PublicProductDto): void { this.addLine(p, null, []); }

  protected optLabel(o: ProductOptionDto): string {
    return o.price > 0 ? `${o.name}  +${money(o.price)}` : o.name;
  }

  /** +1 / −1 sobre una línea concreta del carrito (respeta sus modificadores). */
  protected incLine(key: string): void {
    this.cart.update((lines) => lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)));
  }
  protected decLine(key: string): void {
    this.cart.update((lines) => lines.map((l) => (l.key === key ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0));
  }

  /** dec del stepper en la tarjeta (producto sin modificadores). */
  protected dec(p: PublicProductDto): void { this.decLine(this.lineKey(p.id, null, [])); }

  protected clearCart(): void { this.cart.set([]); }

  // ---- Selector de modificadores ----
  protected readonly modProduct = signal<PublicProductDto | null>(null);
  protected readonly modVariant = signal<ProductOptionDto | null>(null);
  protected readonly modExtras = signal<ProductOptionDto[]>([]);

  protected openMods(p: PublicProductDto): void {
    this.modProduct.set(p);
    this.modVariant.set(p.variants?.length ? p.variants[0] : null);
    this.modExtras.set([]);
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
    this.addLine(p, this.modVariant(), this.modExtras());
    this.modProduct.set(null);
  }

  // ---- UI: hojas (carrito / checkout / confirmación) ----
  protected readonly cartOpen = signal(false);
  protected readonly checkoutOpen = signal(false);
  protected openCart(): void { if (this.cartCount() > 0) this.cartOpen.set(true); }
  protected closeCart(): void { this.cartOpen.set(false); }
  protected goCheckout(): void { this.cartOpen.set(false); this.checkoutOpen.set(true); }
  protected backToCart(): void { this.checkoutOpen.set(false); this.cartOpen.set(true); }
  protected closeCheckout(): void { this.checkoutOpen.set(false); }

  // ---- Formulario de checkout ----
  protected readonly cName = signal('');
  protected readonly cPhone = signal('');
  protected readonly cAddress = signal('');
  protected readonly cNotes = signal('');
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly canSubmit = computed(() => {
    if (!this.cName().trim() || !this.cPhone().trim()) return false;
    if (this.channel() === 'Delivery') {
      if (!this.cAddress().trim()) return false;
      if (this.usesCoverageRadius()) {
        if (this.customerLat() == null || this.customerLng() == null) return false;
        if (this.outOfCoverage()) return false;
      } else if (this.zones().length > 0 && !this.zoneId()) {
        return false;
      }
    }
    return this.cartCount() > 0;
  });

  // ---- Confirmación ----
  protected readonly placed = signal<OrderDto | null>(null);

  protected submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);
    this.formError.set(null);
    this.api.createOrder({
      branchId: this.branchId,
      channel: this.channel(),
      customerName: this.cName().trim(),
      customerPhone: this.cPhone().trim(),
      customerAddress: this.channel() === 'Delivery' ? this.cAddress().trim() : '',
      notes: this.cNotes().trim(),
      deliveryZoneId: this.channel() === 'Delivery' && !this.usesCoverageRadius() ? (this.zoneId() || null) : null,
      customerLat: this.channel() === 'Delivery' && this.usesCoverageRadius() ? this.customerLat() : null,
      customerLng: this.channel() === 'Delivery' && this.usesCoverageRadius() ? this.customerLng() : null,
      couponCode: this.appliedCode() || null,
      redeemPoints: this.redeemPoints(),
      payOnline: this.payOnline(),
      returnUrl: window.location.href,  // el front sabe a dónde volver tras pagar
      tipRestaurant: this.tipRestaurant(),
      tipRider: this.channel() === 'Delivery' ? this.tipRider() : 0,
      items: this.cart().map((l) => ({ productId: l.product.id, quantity: l.qty, variant: l.variant, extras: l.extras })),
    }).subscribe({
      next: (order) => {
        this.placed.set(order);
        this.checkoutOpen.set(false);
        this.submitting.set(false);
        // Pago en línea: abre el link de pago en una pestaña nueva.
        if (order.paymentUrl) this.openPayment();
      },
      error: (e) => {
        this.formError.set(e?.error?.mensaje ?? e?.error?.message ?? 'No se pudo enviar tu pedido. Intenta de nuevo.');
        this.submitting.set(false);
      },
    });
  }

  /** Abre el link de pago del pedido recién creado. */
  protected openPayment(): void {
    const url = this.placed()?.paymentUrl;
    if (url) window.open(url, '_blank');
  }

  /** Reinicia para hacer otro pedido tras la confirmación. */
  protected newOrder(): void {
    this.placed.set(null);
    this.cart.set([]);
    this.cName.set(''); this.cPhone.set(''); this.cAddress.set(''); this.cNotes.set('');
    this.activeCat.set('all'); this.zoneId.set('');
    this.customerLat.set(null); this.customerLng.set(null);
    this.removeCoupon();
    this.loyalty.set(null); this.redeemPoints.set(false);
    this.payOnline.set(false);
    this.tipRestaurantPct.set(null); this.tipRestaurantCustom.set(null); this.tipRider.set(0);
  }

  protected channelLabel(c: OrderChannel): string {
    return this.channels.find((x) => x.value === c)?.label ?? c;
  }

  /** ¿La sucursal tiene WhatsApp configurado? */
  protected readonly hasWhatsapp = computed(() => !!this.menu()?.branchWhatsapp);

  /**
   * Construye el enlace wa.me con el resumen del pedido para que el cliente
   * lo confirme por WhatsApp con el restaurante.
   */
  protected whatsappUrl(ord: OrderDto): string {
    const phone = this.menu()?.branchWhatsapp ?? '';
    const lines = [
      `*Nuevo pedido ${ord.code}*`,
      `${this.menu()?.branchName ?? ''}`,
      `Tipo: ${this.channelLabel(ord.channel)}`,
      '',
      ...ord.items.map((i) => `• ${i.quantity}× ${i.productName} — ${money(i.unitPrice * i.quantity)}`),
      '',
      ord.deliveryFee > 0 ? `Envío: ${money(ord.deliveryFee)}` : '',
      `*Total: ${money(ord.total)}*`,
      '',
      `Cliente: ${ord.customerName}`,
      `Teléfono: ${ord.customerPhone}`,
      ord.customerAddress ? `Dirección: ${ord.customerAddress}` : '',
      ord.notes ? `Notas: ${ord.notes}` : '',
    ].filter((l) => l !== '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  protected sendWhatsapp(ord: OrderDto): void {
    window.open(this.whatsappUrl(ord), '_blank');
  }

  ngOnInit(): void {
    this.branchId = this.route.snapshot.paramMap.get('branchId') ?? '';
    if (!this.branchId) {
      this.loading.set(false);
      this.loadError.set('No se indicó la sucursal.');
      return;
    }
    this.api.menu(this.branchId).subscribe({
      next: (m) => { this.menu.set(m); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No pudimos cargar el menú de esta sucursal.');
      },
    });
  }
}

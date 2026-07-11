import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  CajaState, CartItem, CashMovement, InventoryItem, KitchenOrder,
  OrderColumn, OrdersState,
} from '@shared/models';
import { IVA_RATE, money } from '@shared/format';
import { ComandaApi } from '@core/api/comanda-api.service';
import { ToastService } from '@core/ui/toast.service';
import {
  CashSessionDto, CategoryDto, DriverDto, InventoryItemDto, MovementType, OrderBoardDto, OrderDto,
  ProductDto, ProductOptionDto,
} from '@core/api/models';

type Theme = 'light' | 'dark';
type Range = 'today' | 'week' | 'month';
type SettingsTab = 'usuarios' | 'impresoras' | 'sucursales' | 'pagos' | 'entregas' | 'promociones';

/**
 * Single source of truth for Comanda, ported from the prototype's DCLogic
 * state. Signals drive the standalone screen components.
 */
@Injectable({ providedIn: 'root' })
export class ComandaStore {
  private readonly api = inject(ComandaApi);
  private readonly toast = inject(ToastService);

  // ---- UI state ----
  readonly theme = signal<Theme>('light');
  readonly range = signal<Range>('today');
  readonly posCat = signal<string>('Fondos');
  readonly menuCat = signal<string>('Fondos');
  readonly settingsTab = signal<SettingsTab>('usuarios');

  // ---- Catálogo (API) ----
  readonly products = signal<ProductDto[]>([]);
  readonly categories = signal<CategoryDto[]>([]);

  // ---- POS / cart ----
  readonly cart = signal<CartItem[]>([]);
  readonly orderChannel = signal<'mesa' | 'llevar' | 'delivery'>('mesa');
  readonly tableNumber = signal<number>(1);
  readonly discount = signal<number>(0);
  readonly payment = signal<string>('efectivo');

  /** Etiqueta de destino del pedido que se envía al backend (campo `table`). */
  readonly table = computed(() =>
    this.orderChannel() === 'mesa'
      ? `Mesa ${this.tableNumber()}`
      : this.orderChannel() === 'llevar'
        ? 'Para llevar'
        : 'Delivery',
  );

  // ---- Domain data (se cargan desde la API en cada pantalla) ----
  readonly orders = signal<OrdersState>({ nuevos: [], preparacion: [], listos: [], entregados: [] });
  readonly inventory = signal<InventoryItem[]>([]);
  readonly caja = signal<CajaState>({
    open: false, branch: 'Sucursal Centro', cashier: '—', openedAt: '—',
    salesEfectivo: 0, salesTarjeta: 0, salesTransfer365: 0, salesTransfer: 0, movements: [],
  });
  readonly settingsOn = signal<Record<string, boolean>>({
    'pr-cocina': true, 'pr-caja': true, 'pr-barra': false,
    'pay-efectivo': true, 'pay-tarjeta': true, 'pay-transfer365': true,
    'pay-transfer': true, 'pay-online': false,
  });

  // ---- Derived cart figures (IVA 13% incluido) ----
  readonly subtotal = computed(() => this.cart().reduce((a, c) => a + c.price * c.qty, 0));
  readonly discountAmount = computed(() => (this.subtotal() * this.discount()) / 100);
  readonly total = computed(() => this.subtotal() - this.discountAmount());
  readonly cartCount = computed(() => this.cart().reduce((a, c) => a + c.qty, 0));
  readonly ivaIncluded = computed(() => this.total() - this.total() / (1 + IVA_RATE));

  constructor() {
    // Reflect the theme onto <html> so the CSS variables switch globally.
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });
  }

  // ---- Theme ----
  toggleTheme(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  // ---- Cart ----
  private lineKey(id: string, variant: string | null, extras: string[]): string {
    return `${id}|${variant ?? ''}|${[...extras].sort().join(',')}`;
  }

  /** Agrega al carrito calculando el precio unitario con modificadores (base + variante + extras). */
  addToCart(
    p: { id: string; name: string; price: number },
    variant: ProductOptionDto | null = null,
    extras: ProductOptionDto[] = [],
  ): void {
    const unitPrice = p.price + (variant?.price ?? 0) + extras.reduce((s, e) => s + e.price, 0);
    const variantName = variant?.name ?? null;
    const extraNames = extras.map((e) => e.name);
    const key = this.lineKey(p.id, variantName, extraNames);
    const modifiers = [variant?.name, ...extras.map((e) => '+' + e.name)].filter(Boolean).join(' · ');

    this.cart.update((cart) => {
      const ex = cart.find((c) => c.key === key);
      return ex
        ? cart.map((c) => (c.key === key ? { ...c, qty: c.qty + 1 } : c))
        : [...cart, { key, id: p.id, name: p.name, price: unitPrice, qty: 1, variant: variantName, extras: extraNames, modifiers }];
    });
  }

  changeQty(key: string, d: number): void {
    this.cart.update((cart) =>
      cart.map((c) => (c.key === key ? { ...c, qty: Math.max(1, c.qty + d) } : c)),
    );
  }

  removeItem(key: string): void {
    this.cart.update((cart) => cart.filter((c) => c.key !== key));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  /** Cantidad total de un producto en el carrito (sumando sus variantes). */
  qtyInCart(id: string): number {
    return this.cart().filter((c) => c.id === id).reduce((n, c) => n + c.qty, 0);
  }

  setDiscount(d: number): void {
    this.discount.set(d);
  }

  setPayment(id: string): void {
    this.payment.set(id);
  }

  /** Cambia el tipo de pedido (mesa / para llevar / delivery). */
  setChannel(c: 'mesa' | 'llevar' | 'delivery'): void {
    this.orderChannel.set(c);
  }

  /** Sube o baja el número de mesa, acotado a 1..99. */
  bumpTable(delta: number): void {
    this.tableNumber.update((n) => Math.min(99, Math.max(1, n + delta)));
  }

  // ---- Inventory ----
  private static toInventory(d: InventoryItemDto): InventoryItem {
    return { id: d.id, name: d.name, cat: d.category, stock: d.stock, unit: d.unit, min: d.min, cost: d.cost };
  }

  /** Carga el inventario desde la API. */
  loadInventory(): void {
    this.api.listInventory().subscribe((items) =>
      this.inventory.set(items.map(ComandaStore.toInventory)),
    );
  }

  /** Ajusta el stock vía API (delta) y refleja el resultado autoritativo del servidor. */
  adjustStock(id: string, d: number): void {
    this.api.adjustStock(id, d).subscribe((updated) =>
      this.inventory.update((inv) =>
        inv.map((i) => (i.id === id ? ComandaStore.toInventory(updated) : i)),
      ),
    );
  }

  /** Crea un insumo de inventario y recarga la lista. */
  createInventoryItem(body: { name: string; category: string; stock: number; unit: string; min: number; cost: number }): void {
    this.api.createInventory(body).subscribe(() => { this.loadInventory(); this.toast.success('Insumo agregado.'); });
  }

  // ---- Settings switches ----
  toggleSetting(id: string): void {
    this.settingsOn.update((s) => ({ ...s, [id]: !s[id] }));
  }

  // ---- Caja (API) ----
  private static hhmm(iso: string): string {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  private static toCaja(s: CashSessionDto): CajaState {
    return {
      open: s.isOpen, branch: s.branchName, cashier: s.cashierName,
      openedAt: ComandaStore.hhmm(s.openedAt),
      salesEfectivo: s.salesEfectivo, salesTarjeta: s.salesTarjeta,
      salesTransfer365: s.salesTransfer365, salesTransfer: s.salesTransfer,
      movements: s.movements.map((m): CashMovement => ({
        time: ComandaStore.hhmm(m.createdAt), label: m.label, sub: m.sub,
        amount: m.amount, type: m.type.toLowerCase() as CashMovement['type'],
      })),
    };
  }

  private static closedCaja(branch: string): CajaState {
    return {
      open: false, branch, cashier: '—', openedAt: '—',
      salesEfectivo: 0, salesTarjeta: 0, salesTransfer365: 0, salesTransfer: 0, movements: [],
    };
  }

  /** Carga la caja abierta del día (404 = no hay caja abierta). */
  loadCaja(): void {
    this.api.currentCaja().subscribe({
      next: (s) => this.caja.set(ComandaStore.toCaja(s)),
      error: () => this.caja.set(ComandaStore.closedCaja(this.caja().branch || 'Sucursal Centro')),
    });
  }

  /** Abre o cierra la caja según su estado actual. */
  toggleCaja(): void {
    const c = this.caja();
    if (c.open) {
      this.api.closeCaja().subscribe((s) => { this.caja.set(ComandaStore.toCaja(s)); this.toast.success('Caja cerrada.'); });
    } else {
      this.api.openCaja({ branchName: c.branch || 'Sucursal Centro', cashier: c.cashier !== '—' ? c.cashier : 'Cajero', openingFund: 0 })
        .subscribe((s) => { this.caja.set(ComandaStore.toCaja(s)); this.toast.success('Caja abierta.'); });
    }
  }

  /** Registra un movimiento de caja con monto y concepto reales. */
  registerMovement(label: string, sub: string, amount: number, type: MovementType): void {
    this.api.addMovement({ label, sub, amount, type })
      .subscribe((s) => { this.caja.set(ComandaStore.toCaja(s)); this.toast.success('Movimiento registrado.'); });
  }

  // ---- Kanban (API) ----
  private relativeTime(iso: string): string {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (min < 1) return 'hace instantes';
    if (min < 60) return `hace ${min} min`;
    return `hace ${Math.round(min / 60)} h`;
  }

  private toKitchen(o: OrderDto): KitchenOrder {
    return {
      id: o.id, code: o.code, table: o.table, time: this.relativeTime(o.createdAt),
      items: o.items.map((i) => `${i.quantity}× ${i.productName}${i.modifiers ? ' (' + i.modifiers + ')' : ''}`),
      total: money(o.total), who: o.createdByName,
      channel: o.channel, online: o.createdByName === 'Tienda online',
      customer: o.customerName, phone: o.customerPhone, address: o.customerAddress, notes: o.notes,
      isDelivery: o.channel === 'Delivery', zone: o.deliveryZoneName,
      driverId: o.driverId, driver: o.driverName, dispatched: !!o.dispatchedAt,
      paid: o.isPaid,
    };
  }

  /** Carga el tablero de pedidos desde la API. */
  loadOrders(): void {
    this.api.orderBoard().subscribe((b: OrderBoardDto) =>
      this.orders.set({
        nuevos: b.nuevos.map((o) => this.toKitchen(o)),
        preparacion: b.preparacion.map((o) => this.toKitchen(o)),
        listos: b.listos.map((o) => this.toKitchen(o)),
        entregados: b.entregados.map((o) => this.toKitchen(o)),
      }),
    );
  }

  /** Mueve un pedido vía API (dir +1/-1) y recarga el tablero. */
  moveOrder(id: string, _fromKey: OrderColumn, dir: number): void {
    this.api.moveOrder(id, dir >= 0 ? 1 : -1).subscribe(() => this.loadOrders());
  }

  // ---- Repartidores (para asignar en el kanban) ----
  readonly drivers = signal<DriverDto[]>([]);
  loadDrivers(): void {
    this.api.listDrivers().subscribe((d) => this.drivers.set(d.filter((x) => x.isActive)));
  }

  /** Asigna un repartidor a un pedido de delivery (lo marca "en camino"). */
  assignDriver(orderId: string, driverId: string): void {
    this.api.assignDriver(orderId, driverId).subscribe(() => { this.loadOrders(); this.toast.success('Repartidor asignado.'); });
  }

  // ---- Catálogo (API) ----
  /** Carga productos y categorías desde la API. */
  loadCatalog(): void {
    this.api.listProducts().subscribe((p) => this.products.set(p));
    this.api.listCategories().subscribe((c) => this.categories.set(c));
  }

  /** Cambia la disponibilidad de un producto vía API. */
  setAvailability(id: string, value: boolean): void {
    this.api.setProductAvailability(id, value).subscribe((updated) =>
      this.products.update((list) => list.map((p) => (p.id === id ? updated : p))),
    );
  }

  /** Crea o actualiza un producto y recarga el catálogo. */
  saveProduct(body: Partial<ProductDto>, id?: string): void {
    const obs = id ? this.api.updateProduct(id, body) : this.api.createProduct(body);
    obs.subscribe(() => { this.loadCatalog(); this.toast.success(id ? 'Producto actualizado.' : 'Producto creado.'); });
  }

  /** Crea una categoría y recarga el catálogo; selecciona la nueva en el menú. */
  createCategory(name: string): void {
    this.api.createCategory(name).subscribe((c) => {
      this.menuCat.set(c.name);
      this.loadCatalog();
      this.toast.success('Categoría creada.');
    });
  }

  /** Renombra una categoría y recarga el catálogo (mantiene la selección actual). */
  renameCategory(id: string, name: string): void {
    const wasSelected = this.categories().find((c) => c.id === id)?.name === this.menuCat();
    this.api.renameCategory(id, name).subscribe((c) => {
      if (wasSelected) this.menuCat.set(c.name);
      this.loadCatalog();
      this.toast.success('Categoría actualizada.');
    });
  }

  /** Elimina una categoría (el backend rechaza si tiene productos) y recarga el catálogo. */
  deleteCategory(id: string): void {
    this.api.deleteCategory(id).subscribe(() => {
      const next = this.categories().find((c) => c.id !== id);
      if (next) this.menuCat.set(next.name);
      this.loadCatalog();
      this.toast.success('Categoría eliminada.');
    });
  }

  /** Crea un pedido en la API con el carrito actual y lo vacía. */
  createOrderFromCart(onDone?: () => void): void {
    const items = this.cart().map((c) => ({
      productId: c.id, productName: c.name, modifiers: c.modifiers, unitPrice: c.price, quantity: c.qty,
    }));
    if (items.length === 0) return;
    // El descuento manual (fichas %) ahora se persiste en el pedido.
    this.api.createOrder({ table: this.table(), manualDiscount: this.discountAmount(), items }).subscribe((o) => {
      this.clearCart();
      this.toast.success(`Pedido ${o.code} creado.`);
      onDone?.();
    });
  }
}

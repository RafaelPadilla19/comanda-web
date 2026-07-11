/* ============================================================
   Seed data — "Sabores del Puerto" (cocina salvadoreña, costa de
   La Libertad). Currency USD. Adapted from the Comanda handoff.
   ============================================================ */
import { Product, MenuProduct, InventoryItem, OrdersState, CajaState, CartItem } from './models';

/** Catalog used by the POS grid. */
export function allProducts(): Product[] {
  return [
    { id: 'pupusas', name: 'Pupusas Revueltas', price: 3.5, emoji: '🫓', tint: 'var(--amber-soft)', cat: 'Entradas' },
    { id: 'yuca', name: 'Yuca con Chicharrón', price: 4.5, emoji: '🍟', tint: 'var(--amber-soft)', cat: 'Entradas' },
    { id: 'enchiladas', name: 'Enchiladas', price: 4.0, emoji: '🌮', tint: 'var(--red-soft)', cat: 'Entradas' },
    { id: 'tamales', name: 'Tamales de Elote', price: 3.0, emoji: '🌽', tint: 'var(--amber-soft)', cat: 'Entradas' },
    { id: 'mariscada', name: 'Mariscada', price: 12.5, emoji: '🦞', tint: 'var(--red-soft)', cat: 'Fondos' },
    { id: 'camarones', name: 'Camarones al Ajillo', price: 11.0, emoji: '🦐', tint: 'var(--primary-soft)', cat: 'Fondos' },
    { id: 'pescado', name: 'Pescado Frito Entero', price: 10.5, emoji: '🐟', tint: 'var(--blue-soft)', cat: 'Fondos' },
    { id: 'pollo', name: 'Pollo Encebollado', price: 7.5, emoji: '🍗', tint: 'var(--amber-soft)', cat: 'Fondos' },
    { id: 'carne', name: 'Carne Asada', price: 9.0, emoji: '🥩', tint: 'var(--red-soft)', cat: 'Fondos' },
    { id: 'sopapata', name: 'Sopa de Pata', price: 6.5, emoji: '🍲', tint: 'var(--amber-soft)', cat: 'Fondos' },
    { id: 'horchata', name: 'Horchata', price: 1.75, emoji: '🥛', tint: 'var(--violet-soft)', cat: 'Bebidas' },
    { id: 'ensalada', name: 'Fresco de Ensalada', price: 1.75, emoji: '🍹', tint: 'var(--primary-soft)', cat: 'Bebidas' },
    { id: 'kolashampan', name: 'Kolashampán', price: 1.25, emoji: '🥤', tint: 'var(--amber-soft)', cat: 'Bebidas' },
    { id: 'pilsener', name: 'Cerveza Pilsener', price: 2.5, emoji: '🍺', tint: 'var(--amber-soft)', cat: 'Bebidas' },
    { id: 'cafe', name: 'Café', price: 1.5, emoji: '☕', tint: 'var(--surface-hover)', cat: 'Bebidas' },
    { id: 'quesadilla', name: 'Quesadilla Salvadoreña', price: 2.25, emoji: '🍰', tint: 'var(--amber-soft)', cat: 'Postres' },
    { id: 'nuegados', name: 'Nuégados con Miel', price: 2.75, emoji: '🍩', tint: 'var(--amber-soft)', cat: 'Postres' },
    { id: 'platano', name: 'Plátano en Miel', price: 2.5, emoji: '🍌', tint: 'var(--amber-soft)', cat: 'Postres' },
  ];
}

/** Richer entries used by the Menú digital editor + mobile preview. */
export function menuData(): MenuProduct[] {
  return [
    { id: 'pupusas', name: 'Pupusas Revueltas', price: 3.5, emoji: '🫓', cat: 'Entradas', desc: 'Tres pupusas de queso, frijol y chicharrón con curtido', variants: ['Maíz', 'Arroz'], extras: ['Curtido extra', 'Queso extra'] },
    { id: 'yuca', name: 'Yuca con Chicharrón', price: 4.5, emoji: '🍟', cat: 'Entradas', desc: 'Yuca frita o sancochada con chicharrón y curtido', variants: ['Frita', 'Sancochada'], extras: ['Pepescas'] },
    { id: 'enchiladas', name: 'Enchiladas', price: 4.0, emoji: '🌮', cat: 'Entradas', desc: 'Tortillas doradas con carne, huevo y salsa', variants: [], extras: ['Aguacate'] },
    { id: 'mariscada', name: 'Mariscada', price: 12.5, emoji: '🦞', cat: 'Fondos', desc: 'Sopa de mariscos en leche de coco', variants: ['Personal', 'Familiar'], extras: ['Tortillas', 'Picante'] },
    { id: 'camarones', name: 'Camarones al Ajillo', price: 11.0, emoji: '🦐', cat: 'Fondos', desc: 'Camarones salteados al ajillo con arroz', variants: ['Normal', 'Doble'], extras: ['Arroz extra'] },
    { id: 'pollo', name: 'Pollo Encebollado', price: 7.5, emoji: '🍗', cat: 'Fondos', desc: 'Pieza de pollo encebollada con arroz y ensalada', variants: ['Pierna', 'Pechuga'], extras: ['Tortillas', 'Frijoles'] },
    { id: 'horchata', name: 'Horchata', price: 1.75, emoji: '🥛', cat: 'Bebidas', desc: 'Refresco de morro y semillas', variants: ['Vaso', 'Jarra'], extras: [] },
    { id: 'kolashampan', name: 'Kolashampán', price: 1.25, emoji: '🥤', cat: 'Bebidas', desc: 'Gaseosa salvadoreña bien fría', variants: ['Lata', 'Botella'], extras: [] },
    { id: 'quesadilla', name: 'Quesadilla Salvadoreña', price: 2.25, emoji: '🍰', cat: 'Postres', desc: 'Pan dulce de queso con ajonjolí', variants: [], extras: [] },
    { id: 'nuegados', name: 'Nuégados con Miel', price: 2.75, emoji: '🍩', cat: 'Postres', desc: 'Nuégados de yuca bañados en miel de panela', variants: [], extras: [] },
  ];
}

export function seedInventory(): InventoryItem[] {
  return [
    { id: 'pescado', name: 'Filete de pescado', cat: 'Pescados', stock: 1.2, unit: 'kg', min: 5, cost: 6.5 },
    { id: 'camaron', name: 'Camarón', cat: 'Mariscos', stock: 2.0, unit: 'kg', min: 4, cost: 9.0 },
    { id: 'masa', name: 'Masa de maíz', cat: 'Abarrotes', stock: 8, unit: 'kg', min: 10, cost: 0.8 },
    { id: 'queso', name: 'Quesillo', cat: 'Lácteos', stock: 3.0, unit: 'kg', min: 5, cost: 4.5 },
    { id: 'frijol', name: 'Frijol rojo', cat: 'Abarrotes', stock: 22, unit: 'kg', min: 12, cost: 1.2 },
    { id: 'chicharron', name: 'Chicharrón', cat: 'Carnes', stock: 4.5, unit: 'kg', min: 3, cost: 5.5 },
    { id: 'platano', name: 'Plátano', cat: 'Verduras', stock: 18, unit: 'kg', min: 10, cost: 0.5 },
    { id: 'arroz', name: 'Arroz', cat: 'Abarrotes', stock: 40, unit: 'kg', min: 15, cost: 0.9 },
    { id: 'aceite', name: 'Aceite vegetal', cat: 'Abarrotes', stock: 14, unit: 'L', min: 8, cost: 2.2 },
  ];
}

/** El carrito del POS arranca vacío (las líneas se construyen al vender). */
export function seedCart(): CartItem[] {
  return [];
}

/** El tablero real se carga desde la API (store.loadOrders). Estado inicial vacío. */
export function seedOrders(): OrdersState {
  return { nuevos: [], preparacion: [], listos: [], entregados: [] };
}

export function seedCaja(): CajaState {
  return {
    open: true,
    branch: 'Sucursal Centro',
    cashier: 'Carlos Ávila',
    openedAt: '08:15',
    salesEfectivo: 420,
    salesTarjeta: 360,
    salesTransfer365: 245,
    salesTransfer: 145,
    movements: [
      { time: '12:10', label: 'Ingreso de efectivo', sub: 'Cambio adicional', amount: 12, type: 'ingreso' },
      { time: '10:32', label: 'Pago a proveedor', sub: 'Verduras del día', amount: -22, type: 'egreso' },
      { time: '08:15', label: 'Apertura de caja', sub: 'Fondo inicial', amount: 50, type: 'fondo' },
    ],
  };
}

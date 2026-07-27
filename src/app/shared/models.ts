/* ============================================================
   Domain types
   ============================================================ */

import { OrderChannel } from '@core/api/models';

export type ScreenKey =
  | 'dashboard' | 'pos' | 'pedidos' | 'caja'
  | 'menu' | 'inventario' | 'clientes' | 'reportes' | 'inteligencia' | 'pagos' | 'suscripcion' | 'configuracion';

export type Category = 'Entradas' | 'Fondos' | 'Bebidas' | 'Postres';

export interface Product {
  id: string;
  name: string;
  price: number;
  emoji: string;
  tint: string;
  cat: Category;
}

export interface MenuProduct {
  id: string;
  name: string;
  price: number;
  emoji: string;
  cat: Category;
  desc: string;
  variants: string[];
  extras: string[];
}

export interface CartItem {
  key: string;          // producto + modificadores → identifica la línea
  id: string;           // productId
  name: string;
  price: number;        // precio unitario YA con modificadores
  qty: number;
  variant: string | null;
  extras: string[];
  modifiers: string;    // resumen legible "Arroz · +Queso extra"
}

export interface InventoryItem {
  id: string;
  name: string;
  cat: string;
  stock: number;
  unit: string;
  min: number;
  cost: number;
}

export type OrderColumn = 'nuevos' | 'preparacion' | 'listos' | 'entregados';

export interface KitchenOrder {
  id: string;        // Guid real (para mover vía API)
  code: string;      // código visible, p.ej. "#1042"
  table: string;
  time: string;
  items: string[];
  total: string;
  who: string;
  channel: OrderChannel;
  online: boolean;        // true si llegó por la tienda pública (QR)
  customer: string;       // nombre del cliente (vacío en POS)
  phone: string;
  address: string;        // solo Delivery
  notes: string;
  isDelivery: boolean;
  zone: string;           // nombre de la zona de entrega
  driverId: string | null;
  driver: string;         // repartidor asignado
  dispatched: boolean;    // "en camino"
  paid: boolean;          // pagado en línea
  riderJobId: string | null;   // job publicado en el pool de riders externos (RidersHub)
  riderJobStatus: string;      // Open/Accepted/Delivered
}

export type OrdersState = Record<OrderColumn, KitchenOrder[]>;

export interface CashMovement {
  time: string;
  label: string;
  sub: string;
  amount: number;
  type: 'ingreso' | 'egreso' | 'fondo';
}

export interface CajaState {
  open: boolean;
  branch: string;
  cashier: string;
  openedAt: string;
  salesEfectivo: number;
  salesTarjeta: number;
  salesTransfer365: number;
  salesTransfer: number;
  movements: CashMovement[];
}

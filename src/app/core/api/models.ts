/* ============================================================
   Tipos del API (espejo de los DTOs del backend Comanda.Api).
   Los enums viajan como texto (JsonStringEnumConverter).
   ============================================================ */

export type UserRole = 'Administradora' | 'Cajero' | 'Mesera' | 'Cocina';
export type OrderStatus = 'Nuevos' | 'Preparacion' | 'Listos' | 'Entregados';
export type MovementType = 'Ingreso' | 'Egreso' | 'Fondo';
export type OrderChannel = 'Local' | 'Llevar' | 'Delivery';
export type DiscountType = 'Percentage' | 'Fixed';
export type SubscriptionStatus = 'Trial' | 'Active' | 'Suspended' | 'Cancelled' | 'PastDue';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  branchName: string;
  tenantName: string;
  isActive: boolean;
  plan: PlanFeaturesDto | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt: string | null;
}

/** Funciones incluidas en el plan del restaurante (para mostrar/ocultar la UI). */
export interface PlanFeaturesDto {
  planName: string;
  onlinePayments: boolean;
  coupons: boolean;
  loyalty: boolean;
  advancedReports: boolean;
  inventory: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: UserDto;
}

export interface BranchDto {
  id: string;
  name: string;
  address: string;
  hours: string;
  whatsappPhone: string;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface CategoryDto {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ProductOptionDto {
  name: string;
  price: number;
}

export interface ProductDto {
  id: string;
  name: string;
  price: number;
  emoji: string;
  tint: string;
  description: string;
  isAvailable: boolean;
  variants: ProductOptionDto[];
  extras: ProductOptionDto[];
  categoryId: string;
  categoryName: string;
}

export interface OrderItemDto {
  productId: string;
  productName: string;
  modifiers: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderDto {
  id: string;
  code: string;
  table: string;
  status: OrderStatus;
  channel: OrderChannel;
  createdByName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
  deliveryFee: number;
  deliveryZoneName: string;
  driverId: string | null;
  driverName: string;
  dispatchedAt: string | null;
  riderJobId: string | null;
  riderJobStatus: string;
  couponCode: string;
  discountAmount: number;
  isPaid: boolean;
  paymentUrl: string;
  total: number;
  items: OrderItemDto[];
  createdAt: string;
}

export interface CouponDto {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number;
  expiresAt: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  isActive: boolean;
}

export interface CouponValidationDto {
  valid: boolean;
  code: string;
  discount: number;
  message: string;
}

export interface DeliveryZoneDto {
  id: string;
  branchId: string | null;
  name: string;
  fee: number;
  isActive: boolean;
}

export interface DriverDto {
  id: string;
  name: string;
  phone: string;
  branchId: string | null;
  isActive: boolean;
}

export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  avgTicket: number;
  points: number;
  firstOrderAt: string;
  lastOrderAt: string;
}

export interface LoyaltyConfigDto {
  enabled: boolean;
  earnRate: number;
  redeemRate: number;
}

export interface LoyaltyLookupDto {
  enabled: boolean;
  points: number;
  redeemRate: number;
  redeemableAmount: number;
}

export interface CustomerDetailDto {
  customer: CustomerDto;
  orders: OrderDto[];
}

/* ---- Tienda pública (QR) ---- */

export interface PublicProductDto {
  id: string;
  name: string;
  price: number;
  emoji: string;
  tint: string;
  description: string;
  variants: ProductOptionDto[];
  extras: ProductOptionDto[];
  categoryId: string;
  categoryName: string;
}

export interface PublicMenuDto {
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchHours: string;
  branchWhatsapp: string;
  categories: CategoryDto[];
  products: PublicProductDto[];
  deliveryZones: DeliveryZoneDto[];
}

export interface PublicOrderLine {
  productId: string;
  quantity: number;
  variant?: string | null;
  extras: string[];
}

export interface PublicOrderRequest {
  branchId: string;
  channel: OrderChannel;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
  deliveryZoneId: string | null;
  couponCode?: string | null;
  redeemPoints?: boolean;
  payOnline?: boolean;
  returnUrl?: string;
  items: PublicOrderLine[];
}

export interface OrderBoardDto {
  nuevos: OrderDto[];
  preparacion: OrderDto[];
  listos: OrderDto[];
  entregados: OrderDto[];
}

export interface CashMovementDto {
  label: string;
  sub: string;
  amount: number;
  type: MovementType;
  createdAt: string;
}

export interface CashSessionDto {
  id: string;
  branchName: string;
  cashierName: string;
  isOpen: boolean;
  openedAt: string;
  closedAt: string | null;
  salesEfectivo: number;
  salesTarjeta: number;
  salesTransfer365: number;
  salesTransfer: number;
  movements: CashMovementDto[];
}

export interface InventoryItemDto {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  min: number;
  cost: number;
}

export interface PaymentMethodDto {
  key: string;
  label: string;
  description: string;
  emoji: string;
  isOnline: boolean;
  isEnabled: boolean;
}

/** Países de Centroamérica soportados (para registro y configuración). */
export const CA_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
];

export interface CountryDto {
  country: string;
}

/** Método de pago del catálogo por país (administrado en /platform). */
export interface CountryPaymentMethodDto {
  id: string;
  country: string;
  key: string;
  label: string;
  description: string;
  emoji: string;
  isOnline: boolean;
  defaultEnabled: boolean;
  sortOrder: number;
  isActive: boolean;
}

export type CountryPaymentMethodUpsert = Omit<CountryPaymentMethodDto, 'id'> & { id?: string };

export interface PrinterDto {
  key: string;
  name: string;
  model: string;
  use: string;
  connection: string;
  isConnected: boolean;
}

export interface TopProductDto {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface LowStockDto {
  nombre: string;
  stock: number;
  unit: string;
  estado: string;
}

export interface CategorySplitDto {
  categoria: string;
  monto: number;
  porcentaje: number;
}

export interface DashboardDto {
  ventasHoy: number;
  pedidosActivos: number;
  ticketPromedio: number;
  topProductos: TopProductDto[];
  inventarioBajo: LowStockDto[];
  pedidosActivosLista: OrderDto[];
}

export interface SalesReportDto {
  totalVentas: number;
  topProductos: TopProductDto[];
  ventasPorCategoria: CategorySplitDto[];
}

export interface RevenuePointDto {
  date: string;
  label: string;
  monto: number;
}

export interface BranchPerfDto {
  nombre: string;
  ventas: number;
  pedidos: number;
  ticket: number;
}

export interface TestPrinterResult {
  ok: boolean;
  message: string;
}

/** Envoltura de error que devuelve la API. */
export interface ApiError {
  codigo: string;
  mensaje: string;
}

/* ---- Control-Plane / Super-Admin ---- */

export interface PlanDto {
  id: string;
  name: string;
  priceMonthly: number;
  maxBranches: number;
  maxProducts: number;
  maxUsers: number;
  maxOrdersMonth: number;
  overagePrice: number;
  retentionMonths: number;
  onlinePayments: boolean;
  coupons: boolean;
  loyalty: boolean;
  advancedReports: boolean;
  inventory: boolean;
  sortOrder: number;
  isActive: boolean;
}

/** Alta/edición de plan desde la consola del operador (id ausente = crear). */
export type PlanUpsert = Omit<PlanDto, 'id'> & { id?: string };

export interface PlanUsageDto {
  hasPlan: boolean;
  planName: string;
  ordersThisMonth: number;
  maxOrdersMonth: number;
  overagePrice: number;
  overageOrders: number;
  overageAmount: number;
  overageAvailable: boolean;
  allowOverage: boolean;
  branches: number;
  maxBranches: number;
  products: number;
  maxProducts: number;
  users: number;
  maxUsers: number;
  retentionMonths: number;
  onlinePayments: boolean;
  coupons: boolean;
  loyalty: boolean;
  advancedReports: boolean;
  inventory: boolean;
}

export interface InsightCardDto {
  icon: string;
  title: string;
  value: string;
  detail: string;
  tone: string; // good | warn | neutral
}

export interface ComboPairDto {
  productA: string;
  productB: string;
  count: number;
  suggestion: string;
}

export interface InsightsDto {
  hasData: boolean;
  ordersAnalyzed: number;
  cards: InsightCardDto[];
  combos: ComboPairDto[];
}

export interface PlatformAdminDto {
  id: string;
  name: string;
  email: string;
}

export interface PlatformLoginResponse {
  token: string;
  expiresAt: string;
  admin: PlatformAdminDto;
}

export interface PlatformTenantDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  planId: string | null;
  planName: string;
  priceMonthly: number;
  branches: number;
  products: number;
  users: number;
  orders: number;
  createdAt: string;
}

export interface WompiConfigDto {
  appId: string;
  connected: boolean;
}

export interface SubscriptionPaymentDto {
  amount: number;
  planName: string;
  isPaid: boolean;
  createdAt: string;
  paidAt: string | null;
  periodEndsAt: string | null;
  periodMonths: number;
}

export interface BillingDto {
  hasPlan: boolean;
  planName: string;
  priceMonthly: number;
  status: SubscriptionStatus;
  subscriptionEndsAt: string | null;
  payments: SubscriptionPaymentDto[];
  usage: PlanUsageDto | null;
}

export interface SubscriptionCheckoutResponse {
  paid: boolean;
  paymentUrl: string;
  message: string;
}

export interface PlatformMetricsDto {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  mrr: number;
  totalOrders: number;
  totalCustomers: number;
}

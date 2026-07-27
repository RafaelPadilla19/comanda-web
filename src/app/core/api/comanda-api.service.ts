import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BillingDto, BranchDto, BranchPerfDto, CashSessionDto, CategoryDto, CountryDto, CouponDto, CouponValidationDto, CustomerDetailDto,
  CustomerDto, DashboardDto, DeliveryZoneDto, DriverDto, InventoryItemDto, LoyaltyConfigDto, MovementType,
  InsightsDto, OrderBoardDto, OrderDto, PaymentMethodDto, PlanDto, PlanUsageDto, PrinterDto, ProductDto, RevenuePointDto, SalesReportDto,
  SubscriptionCheckoutResponse, TestPrinterResult, UserDto, UserRole, WompiConfigDto,
} from './models';

/** Cliente HTTP único para todos los dominios de la API de Comanda. */
@Injectable({ providedIn: 'root' })
export class ComandaApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // ---- Usuarios ----
  listUsers(): Observable<UserDto[]> { return this.http.get<UserDto[]>(`${this.base}/users`); }
  createUser(body: { name: string; email: string; password: string; role: UserRole; branchId?: string | null }): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.base}/users`, body);
  }
  setUserActive(id: string, isActive: boolean): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.base}/users/${id}/active`, { isActive });
  }
  updateUser(id: string, body: { name: string; role: UserRole; branchId?: string | null }): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/users/${id}`, { ...body, id });
  }

  // ---- Sucursales ----
  listBranches(): Observable<BranchDto[]> { return this.http.get<BranchDto[]>(`${this.base}/branches`); }
  createBranch(body: Partial<BranchDto>): Observable<BranchDto> { return this.http.post<BranchDto>(`${this.base}/branches`, body); }
  updateBranch(id: string, body: Partial<BranchDto>): Observable<BranchDto> { return this.http.put<BranchDto>(`${this.base}/branches/${id}`, { ...body, id }); }

  // ---- Catálogo / menú ----
  listCategories(): Observable<CategoryDto[]> { return this.http.get<CategoryDto[]>(`${this.base}/categories`); }
  createCategory(name: string): Observable<CategoryDto> { return this.http.post<CategoryDto>(`${this.base}/categories`, { name }); }
  renameCategory(id: string, name: string): Observable<CategoryDto> { return this.http.put<CategoryDto>(`${this.base}/categories/${id}`, { name }); }
  deleteCategory(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/categories/${id}`); }
  listProducts(category?: string): Observable<ProductDto[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.http.get<ProductDto[]>(`${this.base}/products${q}`);
  }
  createProduct(body: Partial<ProductDto>): Observable<ProductDto> { return this.http.post<ProductDto>(`${this.base}/products`, body); }
  updateProduct(id: string, body: Partial<ProductDto>): Observable<ProductDto> { return this.http.put<ProductDto>(`${this.base}/products/${id}`, { ...body, id }); }
  setProductAvailability(id: string, isAvailable: boolean): Observable<ProductDto> {
    return this.http.patch<ProductDto>(`${this.base}/products/${id}/availability`, { isAvailable });
  }
  deleteProduct(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/products/${id}`); }

  // ---- Pedidos ----
  orderBoard(): Observable<OrderBoardDto> { return this.http.get<OrderBoardDto>(`${this.base}/orders/board`); }
  listOrders(): Observable<OrderDto[]> { return this.http.get<OrderDto[]>(`${this.base}/orders`); }
  createOrder(body: {
    table: string; createdByName?: string; branchId?: string | null; couponCode?: string | null; manualDiscount?: number;
    channel?: 'Local' | 'Llevar' | 'Delivery'; deliveryZoneId?: string; customerName?: string; customerPhone?: string; customerAddress?: string;
    items: { productId: string; productName: string; modifiers?: string; unitPrice: number; quantity: number }[];
  }): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/orders`, body);
  }
  moveOrder(id: string, direction: 1 | -1): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/orders/${id}/move`, { direction });
  }
  assignDriver(orderId: string, driverId: string): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/orders/${orderId}/assign-driver`, { id: orderId, driverId });
  }

  /** Publica el pedido al pool de riders independientes (RidersHub). */
  requestExternalRider(orderId: string): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/orders/${orderId}/request-external-rider`, {});
  }

  // ---- Delivery: zonas y repartidores ----
  listZones(): Observable<DeliveryZoneDto[]> { return this.http.get<DeliveryZoneDto[]>(`${this.base}/delivery/zones`); }
  createZone(body: { branchId?: string | null; name: string; fee: number; isActive: boolean }): Observable<DeliveryZoneDto> {
    return this.http.post<DeliveryZoneDto>(`${this.base}/delivery/zones`, body);
  }
  updateZone(id: string, body: { branchId?: string | null; name: string; fee: number; isActive: boolean }): Observable<DeliveryZoneDto> {
    return this.http.put<DeliveryZoneDto>(`${this.base}/delivery/zones/${id}`, { ...body, id });
  }
  deleteZone(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/delivery/zones/${id}`); }

  // ---- Cupones / promociones ----
  listCoupons(): Observable<CouponDto[]> { return this.http.get<CouponDto[]>(`${this.base}/coupons`); }
  createCoupon(body: Partial<CouponDto>): Observable<CouponDto> { return this.http.post<CouponDto>(`${this.base}/coupons`, body); }
  updateCoupon(id: string, body: Partial<CouponDto>): Observable<CouponDto> { return this.http.put<CouponDto>(`${this.base}/coupons/${id}`, { ...body, id }); }
  deleteCoupon(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/coupons/${id}`); }

  // ---- Suscripción (facturación del SaaS) ----
  billing(): Observable<BillingDto> { return this.http.get<BillingDto>(`${this.base}/billing`); }
  billingPlans(): Observable<PlanDto[]> { return this.http.get<PlanDto[]>(`${this.base}/billing/plans`); }
  billingCheckout(returnUrl: string, planId?: string): Observable<SubscriptionCheckoutResponse> {
    return this.http.post<SubscriptionCheckoutResponse>(`${this.base}/billing/checkout`, { returnUrl, planId });
  }
  setOverage(allow: boolean): Observable<PlanUsageDto> {
    return this.http.put<PlanUsageDto>(`${this.base}/billing/overage`, { allow });
  }

  // ---- Pagos en línea (Wompi por tenant) ----
  wompiConfig(): Observable<WompiConfigDto> { return this.http.get<WompiConfigDto>(`${this.base}/settings/payments/wompi`); }
  saveWompiConfig(body: { appId: string; apiSecret: string }): Observable<WompiConfigDto> {
    return this.http.put<WompiConfigDto>(`${this.base}/settings/payments/wompi`, body);
  }

  // ---- Fidelización ----
  loyaltyConfig(): Observable<LoyaltyConfigDto> { return this.http.get<LoyaltyConfigDto>(`${this.base}/loyalty/config`); }
  saveLoyaltyConfig(body: LoyaltyConfigDto): Observable<LoyaltyConfigDto> { return this.http.put<LoyaltyConfigDto>(`${this.base}/loyalty/config`, body); }

  // ---- CRM: clientes ----
  listCustomers(q?: string): Observable<CustomerDto[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<CustomerDto[]>(`${this.base}/customers${query}`);
  }
  getCustomer(id: string): Observable<CustomerDetailDto> {
    return this.http.get<CustomerDetailDto>(`${this.base}/customers/${id}`);
  }

  listDrivers(): Observable<DriverDto[]> { return this.http.get<DriverDto[]>(`${this.base}/delivery/drivers`); }
  createDriver(body: { branchId?: string | null; name: string; phone: string; isActive: boolean }): Observable<DriverDto> {
    return this.http.post<DriverDto>(`${this.base}/delivery/drivers`, body);
  }
  updateDriver(id: string, body: { branchId?: string | null; name: string; phone: string; isActive: boolean }): Observable<DriverDto> {
    return this.http.put<DriverDto>(`${this.base}/delivery/drivers/${id}`, { ...body, id });
  }

  // ---- Caja ----
  currentCaja(): Observable<CashSessionDto> { return this.http.get<CashSessionDto>(`${this.base}/caja/current`); }
  openCaja(body: { branchId?: string | null; branchName: string; cashier: string; openingFund: number }): Observable<CashSessionDto> {
    return this.http.post<CashSessionDto>(`${this.base}/caja/open`, body);
  }
  closeCaja(): Observable<CashSessionDto> { return this.http.post<CashSessionDto>(`${this.base}/caja/close`, {}); }
  addMovement(body: { label: string; sub: string; amount: number; type: MovementType }): Observable<CashSessionDto> {
    return this.http.post<CashSessionDto>(`${this.base}/caja/movements`, body);
  }

  // ---- Inventario ----
  listInventory(): Observable<InventoryItemDto[]> { return this.http.get<InventoryItemDto[]>(`${this.base}/inventory`); }
  createInventory(body: Omit<InventoryItemDto, 'id'>): Observable<InventoryItemDto> { return this.http.post<InventoryItemDto>(`${this.base}/inventory`, body); }
  adjustStock(id: string, delta: number): Observable<InventoryItemDto> {
    return this.http.post<InventoryItemDto>(`${this.base}/inventory/${id}/adjust`, { delta });
  }

  // ---- Configuración ----
  getCountry(): Observable<CountryDto> { return this.http.get<CountryDto>(`${this.base}/settings/country`); }
  setCountry(country: string): Observable<CountryDto> { return this.http.put<CountryDto>(`${this.base}/settings/country`, { country }); }
  listPaymentMethods(): Observable<PaymentMethodDto[]> { return this.http.get<PaymentMethodDto[]>(`${this.base}/settings/payment-methods`); }
  setPaymentMethod(key: string, isEnabled: boolean): Observable<PaymentMethodDto> {
    return this.http.patch<PaymentMethodDto>(`${this.base}/settings/payment-methods/${key}`, { isEnabled });
  }
  listPrinters(): Observable<PrinterDto[]> { return this.http.get<PrinterDto[]>(`${this.base}/settings/printers`); }
  setPrinter(key: string, isConnected: boolean): Observable<PrinterDto> {
    return this.http.patch<PrinterDto>(`${this.base}/settings/printers/${key}`, { isConnected });
  }
  createPrinter(body: { name: string; model: string; use: string; connection: string }): Observable<PrinterDto> {
    return this.http.post<PrinterDto>(`${this.base}/settings/printers`, body);
  }
  testPrinter(key: string): Observable<TestPrinterResult> {
    return this.http.post<TestPrinterResult>(`${this.base}/settings/printers/${key}/test`, { key });
  }

  // ---- Reportes ----
  dashboard(range?: string): Observable<DashboardDto> {
    const q = range ? `?range=${range}` : '';
    return this.http.get<DashboardDto>(`${this.base}/reports/dashboard${q}`);
  }
  salesReport(range?: string): Observable<SalesReportDto> {
    const q = range ? `?range=${range}` : '';
    return this.http.get<SalesReportDto>(`${this.base}/reports/sales${q}`);
  }
  revenueSeries(days: number): Observable<RevenuePointDto[]> {
    return this.http.get<RevenuePointDto[]>(`${this.base}/reports/revenue-series?days=${days}`);
  }
  branchPerformance(): Observable<BranchPerfDto[]> {
    return this.http.get<BranchPerfDto[]>(`${this.base}/reports/branches`);
  }
  insights(range = 'month'): Observable<InsightsDto> {
    return this.http.get<InsightsDto>(`${this.base}/reports/insights?range=${range}`);
  }
}

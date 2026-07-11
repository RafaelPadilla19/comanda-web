import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CountryPaymentMethodDto, CountryPaymentMethodUpsert, PlanDto, PlanUpsert, PlatformMetricsDto, PlatformTenantDto, SubscriptionStatus, WompiConfigDto } from '../core/models';

/** Endpoints del control-plane (super-admin). El token de plataforma lo adjunta authInterceptor. */
@Injectable({ providedIn: 'root' })
export class PlatformApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  metrics(): Observable<PlatformMetricsDto> { return this.http.get<PlatformMetricsDto>(`${this.base}/platform/metrics`); }
  tenants(): Observable<PlatformTenantDto[]> { return this.http.get<PlatformTenantDto[]>(`${this.base}/platform/tenants`); }
  plans(): Observable<PlanDto[]> { return this.http.get<PlanDto[]>(`${this.base}/platform/plans`); }

  createPlan(plan: PlanUpsert): Observable<PlanDto> {
    return this.http.post<PlanDto>(`${this.base}/platform/plans`, plan);
  }
  updatePlan(plan: PlanUpsert): Observable<PlanDto> {
    return this.http.put<PlanDto>(`${this.base}/platform/plans/${plan.id}`, plan);
  }
  deletePlan(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/platform/plans/${id}`);
  }

  wompi(): Observable<WompiConfigDto> { return this.http.get<WompiConfigDto>(`${this.base}/platform/settings/wompi`); }
  saveWompi(appId: string, apiSecret: string): Observable<WompiConfigDto> {
    return this.http.put<WompiConfigDto>(`${this.base}/platform/settings/wompi`, { appId, apiSecret });
  }

  paymentMethods(): Observable<CountryPaymentMethodDto[]> { return this.http.get<CountryPaymentMethodDto[]>(`${this.base}/platform/payment-methods`); }
  createPaymentMethod(m: CountryPaymentMethodUpsert): Observable<CountryPaymentMethodDto> {
    return this.http.post<CountryPaymentMethodDto>(`${this.base}/platform/payment-methods`, m);
  }
  updatePaymentMethod(m: CountryPaymentMethodUpsert): Observable<CountryPaymentMethodDto> {
    return this.http.put<CountryPaymentMethodDto>(`${this.base}/platform/payment-methods/${m.id}`, m);
  }
  deletePaymentMethod(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/platform/payment-methods/${id}`);
  }

  assignPlan(tenantId: string, planId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/platform/tenants/${tenantId}/plan`, { id: tenantId, planId });
  }
  setStatus(tenantId: string, status: SubscriptionStatus): Observable<void> {
    return this.http.put<void>(`${this.base}/platform/tenants/${tenantId}/status`, { id: tenantId, status });
  }
}

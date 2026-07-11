import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BranchDto, CouponValidationDto, LoyaltyLookupDto, OrderDto, PublicMenuDto, PublicOrderRequest } from '@core/api/models';

/**
 * Cliente HTTP de la tienda pública (QR). Consume los endpoints anónimos
 * `/public/*` — no requiere sesión ni token.
 */
@Injectable({ providedIn: 'root' })
export class StorefrontApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  branches(slug: string): Observable<BranchDto[]> {
    return this.http.get<BranchDto[]>(`${this.base}/public/t/${encodeURIComponent(slug)}/branches`);
  }

  menu(branchId: string): Observable<PublicMenuDto> {
    return this.http.get<PublicMenuDto>(`${this.base}/public/branches/${branchId}/menu`);
  }

  createOrder(body: PublicOrderRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/public/orders`, body);
  }

  validateCoupon(branchId: string, code: string, subtotal: number): Observable<CouponValidationDto> {
    return this.http.post<CouponValidationDto>(`${this.base}/public/coupons/validate`, { branchId, code, subtotal });
  }

  loyaltyLookup(branchId: string, phone: string): Observable<LoyaltyLookupDto> {
    return this.http.post<LoyaltyLookupDto>(`${this.base}/public/loyalty/lookup`, { branchId, phone });
  }
}
